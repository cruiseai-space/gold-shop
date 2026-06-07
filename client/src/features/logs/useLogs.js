// client/src/features/logs/useLogs.js
import { useQuery } from '@tanstack/react-query';
import * as logsApi from '../../api/logs.js';

const QUERY_KEY = ['logs'];

export function useLogs(filters) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: () => logsApi.list(filters),
    keepPreviousData: true,
  });
}
