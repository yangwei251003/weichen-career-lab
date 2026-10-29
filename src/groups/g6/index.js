import { mountRelationships,mountTrial } from './relationships.js';
import { mountRunway } from './runway.js';
import { mountExperiments } from './experiments.js';
import { mountBusiness } from './business.js';
import { validateRelationships,validateTrial,validateRunway,validateExperiments,validateBusiness } from './logic.js';
export const apps={'26':{mount:mountRelationships,validate:validateRelationships},'27':{mount:mountTrial,validate:validateTrial},'28':{mount:mountRunway,validate:validateRunway},'29':{mount:mountExperiments,validate:validateExperiments},'30':{mount:mountBusiness,validate:validateBusiness}};
