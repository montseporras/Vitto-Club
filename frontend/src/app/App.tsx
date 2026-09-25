import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';
import { AdminLayout } from './layouts/AdminLayout';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminLayout />
    </QueryClientProvider>
  );
}

export default App;
