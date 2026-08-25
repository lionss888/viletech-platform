type TextWidgetProps = {
  content: string;
};

export function TextWidget(props: TextWidgetProps): JSX.Element {
  return <p className="bdui-text">{props.content}</p>;
}
