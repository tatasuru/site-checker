export interface VueFlowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    url: string;
    title: string;
    depth: number;
  };
}
export interface VueFlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}
