import type { FullDatabaseBackup } from "./backup";
import { getGoogleServicesToken, DRIVE_FILE_SCOPE, GMAIL_SEND_SCOPE, clearGoogleSession } from "./googleAuthService";

const BACKUP_ROOT_FOLDER_NAME = "Zorba ERP Backups";

/**
 * Request or reuse an OAuth access token with Google Drive scope using the persistent 3-month permission engine
 */
export async function getGoogleDriveAccessToken(forcePrompt = false): Promise<string> {
  return await getGoogleServicesToken([DRIVE_FILE_SCOPE, GMAIL_SEND_SCOPE], forcePrompt);
}

/**
 * Get or automatically create the "Zorba ERP Backups" root folder in the user's Google Drive
 */
export async function getOrCreateRootBackupFolder(accessToken: string): Promise<{ id: string; webViewLink?: string }> {
  // 1. Search for existing root folder
  const query = `name = '${BACKUP_ROOT_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, webViewLink)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to search Google Drive folders");
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, webViewLink: data.files[0].webViewLink };
  }

  // 2. Create root folder if not found
  const createUrl = "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink";
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: BACKUP_ROOT_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Automated and manual partitioned database disaster recovery archives from Zorba Infotech ERP",
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || "Failed to create Zorba ERP Backups folder on Google Drive");
  }

  const newFolder = await createRes.json();
  return { id: newFolder.id, webViewLink: newFolder.webViewLink };
}

/**
 * Helper to upload a single JSON file into a target Google Drive folder
 */
async function uploadSingleFileToFolder(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: string,
  description?: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/json",
    description: description || "",
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    content +
    closeDelimiter;

  const uploadUrl =
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to upload ${fileName} to Google Drive`);
  }

  return await uploadRes.json();
}

export interface DriveUploadResult {
  folderId: string;
  folderName: string;
  webViewLink?: string;
  fileCount: number;
}

/**
 * Uploads a FullDatabaseBackup to Google Drive divided across multiple modular JSON files inside a timestamped folder
 */
export async function uploadBackupToGoogleDrive(
  backup: FullDatabaseBackup,
  customFolderName?: string
): Promise<DriveUploadResult> {
  try {
    return await executeUpload(backup, false, customFolderName);
  } catch (err: any) {
    const msg = err?.message || "";
    // If token expired, missing permission, or invalid auth, force re-authorization once
    if (msg.includes("401") || msg.includes("403") || msg.includes("permission") || msg.includes("scope") || msg.includes("Invalid Credentials")) {
      console.warn("Drive sync failed with auth error, retrying with force prompt:", err);
      clearGoogleSession();
      return await executeUpload(backup, true, customFolderName);
    }
    throw err;
  }
}

async function executeUpload(
  backup: FullDatabaseBackup,
  forcePrompt: boolean,
  customFolderName?: string
): Promise<DriveUploadResult> {
  const accessToken = await getGoogleDriveAccessToken(forcePrompt);
  const rootFolder = await getOrCreateRootBackupFolder(accessToken);

  // Format timestamp: e.g. "Backup_2026-08-16_15-30-00"
  const dateObj = new Date(backup.metadata.createdAt);
  const dateStr = dateObj.toISOString().slice(0, 10);
  const timeStr = dateObj.toTimeString().slice(0, 8).replace(/:/g, "-");
  const folderName = customFolderName || `Backup_${dateStr}_${timeStr}_${backup.metadata.scope.replace(/\s+/g, "_")}`;

  // 1. Create timestamped session folder inside "Zorba ERP Backups"
  const createFolderUrl = "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink";
  const folderRes = await fetch(createFolderUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      parents: [rootFolder.id],
      mimeType: "application/vnd.google-apps.folder",
      description: `Zorba ERP Backup Archive (${backup.metadata.counts.totalDocuments} docs across ${backup.metadata.scope}). Exported by ${backup.metadata.exportedBy || "Admin"}`,
    }),
  });

  if (!folderRes.ok) {
    const err = await folderRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create backup folder (HTTP ${folderRes.status})`);
  }

  const sessionFolder = await folderRes.json();

  // 2. Divide database into multiple partitioned files
  const filesToUpload = [
    {
      name: "metadata.json",
      content: JSON.stringify(backup.metadata, null, 2),
      desc: "Backup metadata, record counts, and partition specifications",
    },
    {
      name: "service_calls.json",
      content: JSON.stringify(
        {
          service_calls: backup.data.service_calls || [],
          hierarchicalServiceCalls: backup.data.hierarchicalServiceCalls || [],
        },
        null,
        2
      ),
      desc: "Workshop service calls and hierarchical tickets partition",
    },
    {
      name: "customers.json",
      content: JSON.stringify(backup.data.customers || [], null, 2),
      desc: "Customer directory records partition",
    },
    {
      name: "products.json",
      content: JSON.stringify(
        {
          products: backup.data.products || [],
          categories: backup.data.categories || [],
        },
        null,
        2
      ),
      desc: "Products and categories catalogue partition",
    },
    {
      name: "team_members.json",
      content: JSON.stringify(backup.data.team_members || [], null, 2),
      desc: "Staff and team profiles partition",
    },
    {
      name: "logistics.json",
      content: JSON.stringify(
        {
          service_centers: backup.data.service_centers || [],
          couriers: backup.data.couriers || [],
        },
        null,
        2
      ),
      desc: "Service centers and courier partners partition",
    },
    {
      name: "settings.json",
      content: JSON.stringify(
        {
          device_models: backup.data.device_models || [],
          spare_parts: backup.data.spare_parts || [],
          financial_years: backup.data.financial_years || [],
          counters: backup.data.counters || [],
          admins: backup.data.admins || [],
        },
        null,
        2
      ),
      desc: "System configurations, financial years, counters, and admin records partition",
    },
    {
      name: "full_snapshot.json",
      content: JSON.stringify(backup, null, 2),
      desc: "Consolidated complete database backup archive",
    },
  ];

  // 3. Upload all modular partition files concurrently
  await Promise.all(
    filesToUpload.map((f) =>
      uploadSingleFileToFolder(accessToken, sessionFolder.id, f.name, f.content, f.desc)
    )
  );

  return {
    folderId: sessionFolder.id,
    folderName: sessionFolder.name,
    webViewLink: sessionFolder.webViewLink,
    fileCount: filesToUpload.length,
  };
}

export interface DriveBackupItem {
  id: string;
  name: string;
  createdTime: string;
  isFolder: boolean;
  size?: string;
  webViewLink?: string;
}

/**
 * List backup folders and standalone backup archives in the "Zorba ERP Backups" Google Drive folder
 */
export async function listGoogleDriveBackups(): Promise<DriveBackupItem[]> {
  try {
    const accessToken = await getGoogleDriveAccessToken();
    const rootFolder = await getOrCreateRootBackupFolder(accessToken);

    const query = `'${rootFolder.id}' in parents and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&orderBy=createdTime desc&pageSize=30&fields=files(id,name,mimeType,createdTime,size,webViewLink)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
      size: f.size,
      webViewLink: f.webViewLink,
    }));
  } catch (err) {
    console.warn("Failed to list Google Drive backups:", err);
    return [];
  }
}

/**
 * Fetch and reassemble a FullDatabaseBackup directly from Google Drive (folder or single file)
 */
export async function downloadBackupFromDriveItem(item: DriveBackupItem): Promise<FullDatabaseBackup> {
  try {
    return await executeDownloadFromDriveItem(item, false);
  } catch (err: any) {
    const msg = err?.message || "";
    if (msg.includes("401") || msg.includes("403") || msg.includes("permission") || msg.includes("scope") || msg.includes("Invalid Credentials")) {
      clearGoogleSession();
      return await executeDownloadFromDriveItem(item, true);
    }
    throw err;
  }
}

async function executeDownloadFromDriveItem(item: DriveBackupItem, forcePrompt: boolean): Promise<FullDatabaseBackup> {
  const accessToken = await getGoogleDriveAccessToken(forcePrompt);

  if (!item.isFolder) {
    // Single JSON backup file
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${item.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Failed to download backup file from Google Drive (HTTP ${res.status})`);
    return await res.json();
  }

  // Backup Folder: look for full_snapshot.json or reassemble from partitions
  const listFilesInFolderUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    `'${item.id}' in parents and trashed = false`
  )}&fields=files(id,name)`;

  const listRes = await fetch(listFilesInFolderUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) throw new Error("Failed to list files in backup folder on Google Drive");
  const folderFiles = (await listRes.json()).files || [];

  // Check for full_snapshot.json
  const fullSnapshot = folderFiles.find((f: any) => f.name === "full_snapshot.json");
  if (fullSnapshot) {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fullSnapshot.id}?alt=media`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error("Failed to read full_snapshot.json from Google Drive");
    return await res.json();
  }

  // Fallback: Reassemble from individual partition files
  const fileFetchMap: Record<string, string> = {};
  for (const f of folderFiles) {
    fileFetchMap[f.name] = f.id;
  }

  const fetchJsonFile = async (fileName: string) => {
    const fileId = fileFetchMap[fileName];
    if (!fileId) return null;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok ? await res.json() : null;
  };

  const [metadata, serviceCallsPart, customers, productsPart, teamMembers, logisticsPart, settingsPart] =
    await Promise.all([
      fetchJsonFile("metadata.json"),
      fetchJsonFile("service_calls.json"),
      fetchJsonFile("customers.json"),
      fetchJsonFile("products.json"),
      fetchJsonFile("team_members.json"),
      fetchJsonFile("logistics.json"),
      fetchJsonFile("settings.json"),
    ]);

  if (!metadata) {
    throw new Error("Invalid backup folder: Missing metadata.json in Google Drive archive");
  }

  return {
    metadata,
    data: {
      categories: productsPart?.categories || [],
      products: productsPart?.products || [],
      customers: customers || [],
      team_members: teamMembers || [],
      service_centers: logisticsPart?.service_centers || [],
      couriers: logisticsPart?.couriers || [],
      device_models: settingsPart?.device_models || [],
      spare_parts: settingsPart?.spare_parts || [],
      service_calls: serviceCallsPart?.service_calls || [],
      hierarchicalServiceCalls: serviceCallsPart?.hierarchicalServiceCalls || [],
      financial_years: settingsPart?.financial_years || [],
      counters: settingsPart?.counters || [],
      admins: settingsPart?.admins || [],
    },
  };
}
