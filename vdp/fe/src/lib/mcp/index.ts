import { defineMcp } from "@lovable.dev/mcp-js";

import describeWorkflowTool from "./tools/describe-workflow";
import getDealTool from "./tools/get-deal";
import listDealsTool from "./tools/list-deals";
import listReferenceTool from "./tools/list-reference";

export default defineMcp({
  name: "vdp",
  title: "VDP",
  version: "0.1.0",
  instructions:
    "Инструменты платформы «ВЭД от Вилетех»: реестр платёжных заявок (сделок), карточка сделки с документами и хронологией, справочники (организации, контрагенты, провайдеры, валюты, коды ТН ВЭД, страны, инструменты комплаенс) и описание процесса — этапы, статусы, роли и матрица действий. Данные демонстрационные и доступны только для чтения.",
  tools: [listDealsTool, getDealTool, listReferenceTool, describeWorkflowTool] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});
