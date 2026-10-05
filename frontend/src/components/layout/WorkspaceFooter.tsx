import { useWorkspaceContext } from '../../app/WorkspaceProvider';

export function WorkspaceFooter() {
  const { data } = useWorkspaceContext();
  return (
    <footer className="workspace-footer">
      <span>LADDER</span>
      <code title={data?.configPath}>
        {data?.configPath || '本地配置工作区'}
      </code>
    </footer>
  );
}
