import {  QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query";

export const useQueryData = <TData = unknown>(
  queryKey: QueryKey, 
  queryFn: () => Promise<TData>, 
  enabled: boolean = true,
  options?: Omit<UseQueryOptions<TData, Error, TData, QueryKey>, 'queryKey' | 'queryFn' | 'enabled'>
) => {
    const { data, isPending, isFetched, refetch, isFetching } = useQuery({
      queryKey,
      queryFn,
      enabled,
      ...options,
    })
    return { data, isPending, isFetched, refetch, isFetching }
}