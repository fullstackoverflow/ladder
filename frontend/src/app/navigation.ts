import { FileCode2, Layers3, ListOrdered, Server } from 'lucide-react';
import type { View } from '../types/workspace';
export const views: {
  id: View;
  label: string;
  icon: typeof Server;
  subtitle: string;
  heading: string;
}[] = [
  {
    id: 'upstreams',
    label: '上游',
    icon: Server,
    heading: '管理你的节点来源',
    subtitle: '管理节点来源，本地上游文件可直接在卡片中展开编辑。',
  },
  {
    id: 'rules',
    label: '规则',
    icon: ListOrdered,
    heading: '让规则来源井然有序',
    subtitle: '本地规则文件可直接编辑；拖拽调整 $.rules 中的文件 index。',
  },
  {
    id: 'templates',
    label: '输出模板',
    icon: Layers3,
    heading: '按需构建每一份订阅',
    subtitle: '编辑模板，引用上游与规则，生成适合客户端的配置。',
  },
  {
    id: 'files',
    label: '文件编辑',
    icon: FileCode2,
    heading: '文件工作区',
    subtitle: '编辑本地来源与模板，草稿会在切换文件时保留。',
  },
];
