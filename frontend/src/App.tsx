import { WorkspaceProvider } from './app/WorkspaceProvider';
import { Workbench } from './app/Workbench';
export function App() {
  return (
    <WorkspaceProvider>
      <Workbench />
    </WorkspaceProvider>
  );
}
