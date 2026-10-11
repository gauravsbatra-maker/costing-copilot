import * as XLSX from 'xlsx';

// Old .xls files do not support SheetJS's sheets filter. Read their directory
// records only, then give the cell reader a stream containing the chosen sheet.
function legacyDirectory(data: ArrayBuffer | Uint8Array) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes[0] !== 0xd0 || bytes[1] !== 0xcf) return null;
  const container = XLSX.CFB.read(bytes, {type:'buffer'});
  const entry = XLSX.CFB.find(container,'Workbook') ?? XLSX.CFB.find(container,'Book');
  if (!entry?.content) throw new Error('Could not read this workbook. Please check the sheet and try again.');
  const stream = Uint8Array.from(entry.content);
  const view = new DataView(stream.buffer);
  const bounds: {record:number; offset:number; hidden:number}[] = [];
  let globalsEnd = 0;
  for (let pos = 0; pos + 4 <= stream.length;) {
    const type = view.getUint16(pos,true), size = view.getUint16(pos+2,true);
    if (pos+4+size > stream.length) throw new Error('Could not read this workbook. Please check the sheet and try again.');
    if (type === 0x85 && size >= 8) bounds.push({record:pos,offset:view.getUint32(pos+4,true),hidden:view.getUint8(pos+8)});
    pos += 4+size;
    if (type === 0x0a) {globalsEnd=pos;break;}
  }
  if (!globalsEnd || !bounds.length) throw new Error('Could not read this workbook. Please check the sheet and try again.');
  const names = XLSX.read(bytes,{type:'array',bookSheets:true}).SheetNames;
  if (names.length !== bounds.length) throw new Error('Could not read this workbook. Please check the sheet and try again.');
  return {stream,bounds,globalsEnd,names};
}

export function visibleSheetNames(data: ArrayBuffer | Uint8Array): string[] {
  const legacy = legacyDirectory(data);
  if (legacy) return legacy.names.filter((_,i)=>legacy.bounds[i].hidden===0);
  // An empty selection reads workbook metadata, not worksheet cells.
  const metadata = XLSX.read(data,{type:'array',sheets:[]});
  return metadata.SheetNames.filter(name=>!metadata.Workbook?.Sheets?.find(sheet=>sheet.name===name)?.Hidden);
}

export function readVisibleWorksheet(data: ArrayBuffer | Uint8Array, selected?: string): {sheet:XLSX.WorkSheet;sheetName:string} {
  const visible = visibleSheetNames(data);
  if (!visible.length) throw new Error('No visible tab was found in this workbook.');
  if (selected !== undefined && !visible.includes(selected)) throw new Error('Choose a visible costing tab from this workbook.');
  if (selected === undefined && visible.length > 1) throw new Error('Choose a costing tab from the visible tabs.');
  const sheetName = selected ?? visible[0];
  const legacy = legacyDirectory(data);
  if (legacy) {
    const {stream,bounds,globalsEnd,names} = legacy;
    const chosen = names.indexOf(sheetName), start = bounds[chosen].offset;
    const end = Math.min(stream.length,...bounds.filter(b=>b.offset>start).map(b=>b.offset));
    if (start<globalsEnd || end<=start) throw new Error('Could not read the chosen tab. Please check the sheet and try again.');
    const only = new Uint8Array(globalsEnd+end-start);
    only.set(stream.subarray(0,globalsEnd));
    only.set(stream.subarray(start,end),globalsEnd);
    const view = new DataView(only.buffer);
    // Keep names and formula references intact; unchosen sheet offsets point
    // outside this stream and their cell records are never passed to SheetJS.
    bounds.forEach((bound,i)=>view.setUint32(bound.record+4,i===chosen?globalsEnd:0xf0000000+i,true));
    const workbook = XLSX.read(only,{type:'array',cellFormula:true});
    return {sheet:workbook.Sheets[sheetName],sheetName};
  }
  const workbook = XLSX.read(data,{type:'array',sheets:[sheetName],cellFormula:true});
  return {sheet:workbook.Sheets[sheetName],sheetName};
}
