export * from "./client.js";

// React Query フックは web / mobile から使う。@tanstack/react-query を
// peerDependency にしているため、フックは利用側で薄く組み立てる想定。
// 例（設計書 §5）:
//
//   export function useInventory() {
//     return useQuery({
//       queryKey: ["inventory"],
//       queryFn: async () => (await client.index.$get()).json(),
//     });
//   }
