// 只登记实际存在的应用。后续逐组集成，不以蓝图充当完成。
import {apps as g1} from './groups/g1/index.js';
import {apps as g2} from './groups/g2/index.js';
import {apps as g3} from './groups/g3/index.js';
import {apps as g4} from './groups/g4/index.js';
import {apps as g5} from './groups/g5/index.js';
import {apps as g6} from './groups/g6/index.js';
import {apps as g7} from './groups/g7/index.js';
import {apps as g8} from './groups/g8/index.js';
export const applications = {...g1,...g2,...g3,...g4,...g5,...g6,...g7,...g8};
