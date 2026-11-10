import {validate,migrate} from './core.js';
export const SAVE_KEY='zero-hour-exchange.v1';
export const MANUAL_KEY='zero-hour-exchange.manual.v1';
export const BACKUP_KEY='zero-hour-exchange.before-reset.v1';
export const LEGACY_KEY='zero-hour-exchange.original-v1';
export function save(state, storage=globalThis.localStorage, key=SAVE_KEY) {
  if(!validate(state)) throw new Error('存档数据未通过校验，未覆盖原存档。');
  // Keep the original V1 bytes before the first V2 overwrite, including manual slots.
  const previous=storage.getItem?.(key);
  if(previous){try{if(JSON.parse(previous).version===1&&!storage.getItem(`${LEGACY_KEY}:${key}`))storage.setItem(`${LEGACY_KEY}:${key}`,previous);}catch(e){if(e.name!=='SyntaxError')throw e;}}
  storage.setItem(key, JSON.stringify(state));
}
export function load(storage=globalThis.localStorage, key=SAVE_KEY) {
  const raw=storage.getItem(key);if(raw===null)return null;
  let state;try{state=JSON.parse(raw);}catch{throw new Error('存档内容损坏。可导入备份或确认开始新游戏。');}
  try{return migrate(state);}catch{throw new Error('存档版本或数据不兼容。原存档已保留，请导出备份。');}
}
