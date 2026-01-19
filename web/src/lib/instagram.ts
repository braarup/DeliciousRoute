const IG_USER_ID = process.env.INSTAGRAM_IG_USER_ID;
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

interface PublishInstagramReelParams {
  videoUrl: string;
  caption?: string | null;
}

export async function publishInstagramReel({
  videoUrl,
  caption,
}: PublishInstagramReelParams): Promise<void> {
  if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
    console.warn(
      "Instagram credentials missing; set INSTAGRAM_IG_USER_ID and INSTAGRAM_ACCESS_TOKEN to enable auto-posting."
    );
    return;
  }

  try {
    const baseUrl = `https://graph.facebook.com/v19.0/${IG_USER_ID}`;

    // Step 1: Create media container for the Reel
    const createRes = await fetch(`${baseUrl}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption || "",
        access_token: IG_ACCESS_TOKEN,
      }),
    });

    const createJson = (await createRes.json()) as
      | { id?: string; error?: { message?: string } }
      | any;

    if (!createRes.ok || !createJson.id) {
      console.error("Failed to create Instagram Reel container", createJson);
      return;
    }

    const containerId = createJson.id as string;

    // Step 2: Publish the container
    const publishRes = await fetch(`${baseUrl}/media_publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: IG_ACCESS_TOKEN,
      }),
    });

    const publishJson = (await publishRes.json()) as any;

    if (!publishRes.ok) {
      console.error("Failed to publish Instagram Reel", publishJson);
    }
  } catch (error) {
    console.error("Error publishing Reel to Instagram", error);
  }
}
