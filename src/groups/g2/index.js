import { mountProducts } from './products.js';
import { mountInterview } from './interview.js';
import { mountCost } from './cost.js';
import { mountPresentation } from './presentation.js';
import { mountCRM } from './crm.js';
import { validateProducts,validateInterview,validateCost,validatePresentation,validateCRM } from './logic.js';
export const apps={
  '06':{mount:mountProducts,validate:validateProducts},
  '07':{mount:mountInterview,validate:validateInterview},
  '08':{mount:mountCost,validate:validateCost},
  '09':{mount:mountPresentation,validate:validatePresentation},
  '10':{mount:mountCRM,validate:validateCRM}
};
