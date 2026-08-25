import type { BduiAction, BduiScreen } from '../types/bdui';
import { ActionBarWidget } from './widgets/ActionBarWidget';
import { DataTableWidget } from './widgets/DataTableWidget';
import { DetailFieldsWidget } from './widgets/DetailFieldsWidget';
import { FormWidget } from './widgets/FormWidget';
import { LoginFormWidget } from './widgets/LoginFormWidget';
import { StatusBadgeWidget } from './widgets/StatusBadgeWidget';
import { TextWidget } from './widgets/TextWidget';

type SchemaRendererProps = {
  screen: BduiScreen;
  pathParams?: Record<string, string>;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onRunAction: (action: BduiAction, body?: Record<string, string>) => Promise<unknown>;
  onStatusLoaded?: (status: string) => void;
};

function findAction(screen: BduiScreen, actionId: string): BduiAction | undefined {
  return screen.actions.find((action) => action.id === actionId);
}

/**
 * Renders a BDUI screen by mapping widget types to React components.
 */
export function SchemaRenderer(props: SchemaRendererProps): JSX.Element {
  const pathParams = props.pathParams ?? {};

  return (
    <section className="bdui-screen">
      <header className="bdui-screen-header">
        <h1>{props.screen.title}</h1>
        <span className="bdui-muted">
          {props.screen.id} · v{props.screen.version}
        </span>
      </header>
      <div className="bdui-widgets">
        {props.screen.widgets.map((widget) => {
          switch (widget.type) {
            case 'text':
              return <TextWidget key={widget.id} content={widget.content} />;
            case 'login_form': {
              const action = findAction(props.screen, widget.submitAction);
              if (!action) {
                return <p key={widget.id} className="bdui-error">Action missing: {widget.submitAction}</p>;
              }
              return (
                <LoginFormWidget
                  key={widget.id}
                  submitAction={action}
                  onSubmit={async (submitAction, body) => {
                    await props.onRunAction(submitAction, body);
                  }}
                />
              );
            }
            case 'form': {
              const action = findAction(props.screen, widget.submitAction);
              if (!action) {
                return <p key={widget.id} className="bdui-error">Action missing: {widget.submitAction}</p>;
              }
              return (
                <FormWidget
                  key={widget.id}
                  fields={widget.fields}
                  submitAction={action}
                  onSubmit={async (submitAction, body) => {
                    await props.onRunAction(submitAction, body);
                  }}
                />
              );
            }
            case 'data_table':
              return (
                <DataTableWidget
                  key={widget.id}
                  dataSource={widget.dataSource}
                  columns={widget.columns}
                  rowIdField={widget.rowIdField}
                  onRowClick={
                    widget.rowNavigateTo
                      ? (rowId) =>
                          props.onNavigate(widget.rowNavigateTo!, {
                            formId: rowId,
                          })
                      : undefined
                  }
                />
              );
            case 'status_badge':
              return (
                <StatusBadgeWidget
                  key={widget.id}
                  field={widget.field}
                  dataSource={widget.dataSource}
                  formId={pathParams.formId ?? ''}
                  onStatusLoaded={props.onStatusLoaded}
                />
              );
            case 'detail_fields':
              return (
                <DetailFieldsWidget
                  key={widget.id}
                  dataSource={widget.dataSource}
                  fields={widget.fields}
                  formId={pathParams.formId ?? ''}
                />
              );
            case 'action_bar':
              return (
                <ActionBarWidget
                  key={widget.id}
                  actionIds={widget.actions}
                  actions={props.screen.actions}
                  onAction={async (action) => {
                    await props.onRunAction(action);
                  }}
                />
              );
            default:
              return null;
          }
        })}
      </div>
      {props.screen.page === 'forms.list' ? (
        <div className="bdui-action-bar">
          {props.screen.actions
            .filter((action) => action.navigateTo === 'forms.create')
            .map((action) => (
              <button key={action.id} type="button" onClick={() => props.onNavigate('forms.create')}>
                {action.label}
              </button>
            ))}
        </div>
      ) : null}
    </section>
  );
}
