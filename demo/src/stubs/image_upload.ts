import type { MockHomeAssistant } from "../../src/fake_data/provide_hass";

const MEDIA_PREFIX = "media-source://image_upload";

interface DemoImage {
  dataUrl: string;
  name: string;
  content_type: string;
  filesize: number;
  uploaded_at: string;
}

const demoImages = new Map<string, DemoImage>();

const DEMO_STOCK_IMAGES: DemoImage[] = [
  {
    name: "Living room",
    content_type: "image/png",
    filesize: 0,
    uploaded_at: new Date(0).toISOString(),
    dataUrl: "https://demo.home-assistant.io/stub_config/living_room.png",
  },
  {
    name: "Kitchen",
    content_type: "image/png",
    filesize: 0,
    uploaded_at: new Date(0).toISOString(),
    dataUrl: "https://demo.home-assistant.io/stub_config/kitchen.png",
  },
  {
    name: "Bedroom",
    content_type: "image/png",
    filesize: 0,
    uploaded_at: new Date(0).toISOString(),
    dataUrl: "https://demo.home-assistant.io/stub_config/bedroom.png",
  },
];

let stockSeeded = false;

const seedStockImages = () => {
  if (stockSeeded) {
    return;
  }
  stockSeeded = true;
  DEMO_STOCK_IMAGES.forEach((img, index) => {
    demoImages.set(`demo_stock_${index}`, img);
  });
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

const parseServePath = (path: string): string | undefined => {
  const match = path.match(/\/api\/image\/serve\/([^/]+)/);
  return match?.[1];
};

const resolveImageUrl = (path: string): string => {
  const id = parseServePath(path);
  if (id && demoImages.has(id)) {
    return demoImages.get(id)!.dataUrl;
  }
  return path;
};

export const mockImageUpload = (hass: MockHomeAssistant) => {
  seedStockImages();

  const previousFetchWithAuth = hass.fetchWithAuth;
  const previousHassUrl = hass.hassUrl;

  hass.updateHass({
    hassUrl: (path?: string) => {
      if (!path) {
        return previousHassUrl(path);
      }
      return resolveImageUrl(path);
    },
    fetchWithAuth: async (path: string, init?: Record<string, unknown>) => {
      if (path === "/api/image/upload" && init?.method === "POST") {
        const body = init.body as FormData;
        const file = body.get("file") as File | null;
        if (!file) {
          return new Response(null, { status: 400 });
        }
        const dataUrl = await fileToDataUrl(file);
        const id = `demo_${Date.now()}`;
        demoImages.set(id, {
          dataUrl,
          name: file.name,
          content_type: file.type,
          filesize: file.size,
          uploaded_at: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({
            id,
            name: file.name,
            content_type: file.type,
            filesize: file.size,
            uploaded_at: demoImages.get(id)!.uploaded_at,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const imageId = parseServePath(path);
      if (imageId && demoImages.has(imageId)) {
        const image = demoImages.get(imageId)!;
        const blob = image.dataUrl.startsWith("data:")
          ? await dataUrlToBlob(image.dataUrl)
          : await fetch(image.dataUrl).then((r) => r.blob());
        return new Response(blob, {
          status: 200,
          headers: { "Content-Type": image.content_type },
        });
      }

      if (previousFetchWithAuth) {
        try {
          return await previousFetchWithAuth(path, init);
        } catch {
          // fall through
        }
      }
      return Promise.reject(new Error("Not implemented"));
    },
  });

  hass.mockWS("image/list", () =>
    Array.from(demoImages.entries()).map(([id, image]) => ({
      id,
      name: image.name,
      content_type: image.content_type,
      filesize: image.filesize,
      uploaded_at: image.uploaded_at,
    }))
  );

  hass.mockWS("image/delete", (msg) => {
    demoImages.delete(msg.image_id);
    return null;
  });

  hass.mockWS("image/update", (msg) => {
    const existing = demoImages.get(msg.media_id);
    if (!existing) {
      return null;
    }
    if (msg.name) {
      existing.name = msg.name;
    }
    return {
      id: msg.media_id,
      ...existing,
    };
  });

  hass.mockWS("media_source/browse_media", (msg) => {
    const contentId: string | undefined = msg.media_content_id;

    if (!contentId) {
      return {
        title: "Media",
        media_class: "directory",
        media_content_type: "",
        media_content_id: "",
        can_play: false,
        can_expand: true,
        children_media_class: "app",
        thumbnail: null,
        children: [
          {
            title: "Image upload",
            media_class: "app",
            media_content_type: "app",
            media_content_id: MEDIA_PREFIX,
            can_play: false,
            can_expand: true,
            children_media_class: "image",
            thumbnail: null,
          },
        ],
      };
    }

    if (contentId === MEDIA_PREFIX) {
      return {
        title: "Image upload",
        media_class: "app",
        media_content_type: "app",
        media_content_id: MEDIA_PREFIX,
        can_play: false,
        can_expand: true,
        children_media_class: "image",
        thumbnail: null,
        children: Array.from(demoImages.entries()).map(([id, image]) => ({
          title: image.name,
          media_class: "image",
          media_content_type: image.content_type,
          media_content_id: `${MEDIA_PREFIX}/${id}`,
          can_play: false,
          can_expand: false,
          children_media_class: null,
          thumbnail: image.dataUrl,
        })),
      };
    }

    if (contentId.startsWith(`${MEDIA_PREFIX}/`)) {
      const id = contentId.substring(MEDIA_PREFIX.length + 1);
      const image = demoImages.get(id);
      if (!image) {
        return {
          title: "Not found",
          media_class: "image",
          media_content_type: "",
          media_content_id: contentId,
          can_play: false,
          can_expand: false,
          children_media_class: null,
          thumbnail: null,
        };
      }
      return {
        title: image.name,
        media_class: "image",
        media_content_type: image.content_type,
        media_content_id: contentId,
        can_play: false,
        can_expand: false,
        children_media_class: null,
        thumbnail: image.dataUrl,
      };
    }

    return Promise.reject({
      code: "command_not_mocked",
      message: `media_source/browse_media not mocked for ${contentId}`,
    });
  });

  hass.mockWS("media_source/resolve_media", (msg) => {
    const contentId = msg.media_content_id as string;
    if (contentId.startsWith(`${MEDIA_PREFIX}/`)) {
      const id = contentId.substring(MEDIA_PREFIX.length + 1);
      const image = demoImages.get(id);
      if (image) {
        return {
          url: image.dataUrl,
          mime_type: image.content_type,
        };
      }
    }
    return Promise.reject({
      code: "command_not_mocked",
      message: `media_source/resolve_media not mocked for ${contentId}`,
    });
  });
};
