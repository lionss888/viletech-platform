export interface INodulService {
  parseImage(formData: any): Promise<any>;
}

export const NODUL_SERVICE = 'INodulService';
