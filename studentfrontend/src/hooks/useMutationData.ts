import {
    MutationFunction,
    MutationKey,
    useMutation,
    useMutationState,
    useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'

export const useMutationData = (
    mutationKey: MutationKey,
    mutationFn: MutationFunction<any, any>,
    queryKey?: string | string[] | string[][],
    onSuccess?: (data?: any) => void,
    onError?: (error?: any) => void
) => {
    const client = useQueryClient()
    const { mutate, isPending } = useMutation({
        mutationKey,
        mutationFn,
        onSuccess(data) {
            if (onSuccess) onSuccess(data)
            return
        },
        onError(error) {
            if (onError) onError(error)
            return
        },
        onSettled: async () => {
            if (typeof queryKey === 'string') {
                return await client.invalidateQueries({
                    queryKey: [queryKey],
                    exact: true,
                })
            }
            else {
                if (Array.isArray(queryKey) && Array.isArray(queryKey[0])) {
                    for (let i of queryKey) {
                        await client.invalidateQueries({
                            queryKey: i as string[],
                            exact: true,
                        })
                    }
                } else {
                    await client.invalidateQueries({
                        queryKey: queryKey,
                        exact: true,
                    })
                }
                return {}
            }
        }
    })

    return { mutate, isPending }
}

export const useMutationDataState = (mutationKey: MutationKey) => {
    const data = useMutationState({
        filters: { mutationKey },
        select: (mutation) => {
            return {
                variables: mutation.state.variables as any,
                status: mutation.state.status,
            }
        },
    })

    const latestVariables = data[data.length - 1]
    return { latestVariables }
}