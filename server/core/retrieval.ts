import { getVectorStoreService } from "~~/server/services/vectorStore";

type RetrievalFilter = Partial<{
  documentId: string;
  sourceType: "github" | "pdf" | "word";
  branch: string;
  type: string;
}>;

export async function retrieveContexts(query: string, k = 3, filter?: RetrievalFilter) {
  const vectorStore = await getVectorStoreService();
  const matches = await vectorStore.similaritySearch(query, k, filter);

  const context = matches
    .map((doc: any, i: number) => `¡¾Æ¬¶Î${i + 1}¡¿\n${doc.pageContent}`)
    .join("\n\n");

  return {
    context,
    matches: matches.map((doc: any) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
    })),
  };
}
