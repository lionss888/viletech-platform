export type BduiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type BduiApiRef = {
  method: BduiHttpMethod;
  path: string;
};

export type BduiColumn = {
  key: string;
  label: string;
};

export type BduiFieldType = 'text' | 'email' | 'password' | 'number' | 'select';

export type BduiFieldOption = {
  value: string;
  label: string;
};

export type BduiField = {
  name: string;
  label: string;
  fieldType: BduiFieldType;
  required?: boolean;
  options?: BduiFieldOption[];
};

export type BduiAction = {
  id: string;
  label: string;
  method: BduiHttpMethod;
  path: string;
  bodyFrom?: 'form' | 'none';
  navigateTo?: string;
};

export type BduiLoginFormWidget = {
  type: 'login_form';
  id: string;
  submitAction: string;
};

export type BduiDataTableWidget = {
  type: 'data_table';
  id: string;
  dataSource: BduiApiRef;
  columns: BduiColumn[];
  rowNavigateTo?: string;
  rowIdField?: string;
};

export type BduiFormWidget = {
  type: 'form';
  id: string;
  fields: BduiField[];
  submitAction: string;
};

export type BduiStatusBadgeWidget = {
  type: 'status_badge';
  id: string;
  field: string;
  dataSource: BduiApiRef;
};

export type BduiActionBarWidget = {
  type: 'action_bar';
  id: string;
  actions: string[];
};

export type BduiTextWidget = {
  type: 'text';
  id: string;
  content: string;
};

export type BduiDetailFieldsWidget = {
  type: 'detail_fields';
  id: string;
  dataSource: BduiApiRef;
  fields: BduiColumn[];
};

export type BduiWidget =
  | BduiLoginFormWidget
  | BduiDataTableWidget
  | BduiFormWidget
  | BduiStatusBadgeWidget
  | BduiActionBarWidget
  | BduiTextWidget
  | BduiDetailFieldsWidget;

export type BduiScreen = {
  id: string;
  role: 'user';
  page: string;
  title: string;
  version: number;
  widgets: BduiWidget[];
  actions: BduiAction[];
};

export type BduiUserPage = 'login' | 'forms.list' | 'forms.create' | 'forms.detail';
