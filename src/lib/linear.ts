import type { RequestKind } from "./types";

const LINEAR_API = "https://api.linear.app/graphql";

const TEAM_ID = "3d93e7e8-8101-4130-876a-6d5d83ead7d7";
const PROJECT_ID = "addb8810-e574-486f-8194-749c01ab761e";
const BACKLOG_STATE_ID = "16a85f56-4c62-4183-aad4-33885a2efa38";
const LABEL_IDS: Record<RequestKind, string> = {
  bug: "cfbdab95-2d7c-4878-9a68-4ca2c887019b",
  feature: "53c660b1-d638-4d34-b9ee-cdc7b7843f83",
};

export async function createClubIssue(input: {
  kind: RequestKind;
  title: string;
  details: string;
  fromName: string;
}): Promise<{ url?: string; error?: string }> {
  const key = process.env.LINEAR_API_KEY?.trim();
  if (!key) return { error: "Requests aren't wired yet. Try again later." };

  const kindLabel = input.kind === "bug" ? "Bug" : "Feature";
  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: key.startsWith("lin_api_") ? key : `Bearer ${key}`,
    },
    body: JSON.stringify({
      query: `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { url }
        }
      }`,
      variables: {
        input: {
          teamId: TEAM_ID,
          projectId: PROJECT_ID,
          stateId: BACKLOG_STATE_ID,
          labelIds: [LABEL_IDS[input.kind]],
          title: input.title,
          description: [
            input.details,
            "",
            "---",
            `Kind: ${kindLabel}`,
            `From: ${input.fromName}`,
          ].join("\n"),
        },
      },
    }),
  });

  if (!res.ok) return { error: "Didn't send. Try again." };

  const payload = (await res.json()) as {
    errors?: { message?: string }[];
    data?: { issueCreate?: { success?: boolean; issue?: { url?: string } } };
  };
  if (payload.errors?.length || !payload.data?.issueCreate?.success) {
    return { error: "Didn't send. Try again." };
  }
  return { url: payload.data.issueCreate.issue?.url };
}
