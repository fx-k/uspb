import { Handlers, PageProps } from "$fresh/server.ts";
import { ShortUrl } from "@/utils/database.ts";

const kv = await Deno.openKv();
const ENTRIES_PER_PAGE = 20;

export const handler: Handlers = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const startKey = url.searchParams.get("start");

    // Calculate the starting point for listing keys
    const start = startKey ? ["url", startKey] : ["url"];

    // List keys with pagination
    const iter = kv.list<ShortUrl>({ prefix: ["url"], start, limit: ENTRIES_PER_PAGE + 1 });
    const entries: ShortUrl[] = [];
    let nextStartKey = null;

    for await (const entry of iter) {
      if (entries.length < ENTRIES_PER_PAGE) {
        if (entry.stats.visibility === 'public') {
          entries.push(entry);
        }
      } else {
        // Keep the key of the next entry for pagination
        nextStartKey = entry.key.split(",").pop();
        break;
      }
    }

    return ctx.render({ entries, nextPage: page + 1, nextStartKey });
  },
};

export default function ListPage(props: PageProps<{ entries: ShortUrl[]; nextPage: number; nextStartKey: string | null }>) {
  const { entries, nextPage, nextStartKey } = props.data;

  return (
    <>
      <h1>Public Entries</h1>
      <ul>
        {entries.map((entry) => (
          <li key={entry.key}>
            {entry.type === 'url' ? (
              <a href={entry.content} target="_blank" rel="noopener noreferrer">
                {entry.content}
              </a>
            ) : (
              <p>{entry.content}</p>
            )}
            <p>Access Count: {entry.stats.access}</p>
          </li>
        ))}
      </ul>
      {nextStartKey && (
        <a href={`?page=${nextPage}&start=${nextStartKey}`}>Next Page</a>
      )}
    </>
  );
}