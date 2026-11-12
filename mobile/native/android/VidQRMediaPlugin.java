package app.vidqr.studio;

import android.Manifest;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@CapacitorPlugin(
        name = "VidQRMedia",
        permissions = {
                @Permission(
                        strings = {Manifest.permission.WRITE_EXTERNAL_STORAGE},
                        alias = "storage"
                )
        }
)
public class VidQRMediaPlugin extends Plugin {
    private static final String ALBUM_FOLDER = "VidQR Studio";
    private static final ExecutorService DOWNLOAD_EXECUTOR = Executors.newSingleThreadExecutor();
    private static final Pattern UTF8_FILENAME_PATTERN = Pattern.compile("filename\\*=UTF-8''([^;\\r\\n]+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ASCII_FILENAME_PATTERN = Pattern.compile("filename=\"?([^\";\\r\\n]+)\"?", Pattern.CASE_INSENSITIVE);

    @PluginMethod
    public void readClipboard(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
                String text = "";
                if (clipboard != null && clipboard.hasPrimaryClip()) {
                    ClipData clip = clipboard.getPrimaryClip();
                    if (clip != null && clip.getItemCount() > 0) {
                        CharSequence seq = clip.getItemAt(0).coerceToText(getContext());
                        if (seq != null) {
                            text = seq.toString();
                        }
                    }
                }
                JSObject ret = new JSObject();
                ret.put("value", text);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Không đọc được bộ nhớ tạm: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void saveMediaFromUrl(PluginCall call) {
        String rawUrl = call.getString("url");
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            call.reject("Thiếu đường dẫn tệp cần tải.");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "handleStoragePermission");
            return;
        }

        executeDownloadAndSave(call);
    }

    @PermissionCallback
    private void handleStoragePermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q || getPermissionState("storage") == PermissionState.GRANTED) {
            executeDownloadAndSave(call);
        } else {
            call.reject("Bạn chưa cấp quyền lưu vào bộ nhớ để lưu video/ảnh.");
        }
    }

    private void executeDownloadAndSave(PluginCall call) {
        final String targetUrl = call.getString("url", "").trim();
        final String method = call.getString("method", "GET").toUpperCase(Locale.ROOT);
        final String body = call.getString("body", "");
        final String fallbackFilename = call.getString("filename", "vidqr_media.mp4");
        final String requestedKind = call.getString("kind", "").toLowerCase(Locale.ROOT);

        DOWNLOAD_EXECUTOR.execute(() -> {
            HttpURLConnection conn = null;
            File tempFile = null;
            try {
                URL url = new URL(targetUrl);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod(method);
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(30_000);
                conn.setReadTimeout(300_000);

                if ("POST".equals(method) && body != null && !body.isEmpty()) {
                    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
                    conn.setDoOutput(true);
                    byte[] payloadBytes = body.getBytes(StandardCharsets.UTF_8);
                    conn.setFixedLengthStreamingMode(payloadBytes.length);
                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payloadBytes);
                    }
                }

                int status = conn.getResponseCode();
                if (status < 200 || status >= 300) {
                    String errDetail = readErrorDetail(conn);
                    call.reject(errDetail != null && !errDetail.isEmpty()
                            ? errDetail
                            : "Tải media thất bại (HTTP " + status + ").");
                    return;
                }

                String disposition = conn.getHeaderField("Content-Disposition");
                String rawContentType = conn.getContentType();
                String mimeType = cleanMimeType(rawContentType);
                String filename = resolveFilename(disposition, fallbackFilename, mimeType, requestedKind);
                mimeType = ensureMimeType(mimeType, filename, requestedKind);
                String actualKind = resolveKind(mimeType, filename, requestedKind);

                String ext = extractExtension(filename, actualKind);
                tempFile = File.createTempFile("vidqr_dl_", "." + ext, getContext().getCacheDir());

                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     OutputStream out = new FileOutputStream(tempFile)) {
                    byte[] buf = new byte[16 * 1024];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                    }
                    out.flush();
                }

                String savedTo = persistToDeviceGallery(tempFile, filename, mimeType, actualKind);
                JSObject result = new JSObject();
                result.put("savedTo", savedTo);
                result.put("filename", filename);
                result.put("kind", actualKind);
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Không thể tải và lưu tệp vào Ảnh.");
            } finally {
                if (tempFile != null && tempFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    tempFile.delete();
                }
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    private String persistToDeviceGallery(File tempFile, String filename, String mimeType, String kind) throws IOException {
        boolean isAudio = "audio".equals(kind);
        boolean isImage = "image".equals(kind);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
            values.put(MediaStore.MediaColumns.IS_PENDING, 1);

            Uri collection;
            String relativeDir;
            if (isAudio) {
                collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                relativeDir = Environment.DIRECTORY_DOWNLOADS + File.separator + ALBUM_FOLDER;
            } else if (isImage) {
                collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                relativeDir = Environment.DIRECTORY_PICTURES + File.separator + ALBUM_FOLDER;
            } else {
                collection = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                relativeDir = Environment.DIRECTORY_MOVIES + File.separator + ALBUM_FOLDER;
            }
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativeDir);

            Uri itemUri = resolver.insert(collection, values);
            if (itemUri == null) {
                throw new IOException("Không thể tạo mục mới trong Thư viện Ảnh.");
            }

            try (InputStream in = new FileInputStream(tempFile);
                 OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) {
                    throw new IOException("Không thể ghi dữ liệu vào Thư viện Ảnh.");
                }
                byte[] buf = new byte[16 * 1024];
                int n;
                while ((n = in.read(buf)) != -1) {
                    out.write(buf, 0, n);
                }
                out.flush();
            } catch (IOException e) {
                resolver.delete(itemUri, null, null);
                throw e;
            }

            ContentValues finishValues = new ContentValues();
            finishValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(itemUri, finishValues, null, null);
            return isAudio ? "downloads" : "photos";
        }

        String publicType = isAudio
                ? Environment.DIRECTORY_DOWNLOADS
                : (isImage ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_MOVIES);
        File targetDir = new File(Environment.getExternalStoragePublicDirectory(publicType), ALBUM_FOLDER);
        if (!targetDir.exists() && !targetDir.mkdirs()) {
            throw new IOException("Không thể tạo thư mục lưu tệp.");
        }

        File destFile = uniqueDestinationFile(targetDir, filename);
        try (InputStream in = new FileInputStream(tempFile);
             OutputStream out = new FileOutputStream(destFile)) {
            byte[] buf = new byte[16 * 1024];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
            out.flush();
        }

        MediaScannerConnection.scanFile(
                getContext(),
                new String[]{destFile.getAbsolutePath()},
                new String[]{mimeType},
                null
        );
        return isAudio ? "downloads" : "photos";
    }

    private static File uniqueDestinationFile(File dir, String filename) {
        File candidate = new File(dir, filename);
        if (!candidate.exists()) return candidate;
        int dot = filename.lastIndexOf('.');
        String stem = dot > 0 ? filename.substring(0, dot) : filename;
        String ext = dot > 0 ? filename.substring(dot) : "";
        int index = 1;
        while (candidate.exists()) {
            candidate = new File(dir, stem + " (" + index + ")" + ext);
            index++;
        }
        return candidate;
    }

    private static String readErrorDetail(HttpURLConnection conn) {
        InputStream err = conn.getErrorStream();
        if (err == null) return "";
        try (InputStream in = err; ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[2048];
            int total = 0;
            int n;
            while ((n = in.read(buf)) != -1 && total < 8192) {
                baos.write(buf, 0, n);
                total += n;
            }
            String raw = baos.toString(StandardCharsets.UTF_8.name()).trim();
            if (raw.startsWith("{") && raw.contains("\"detail\"")) {
                try {
                    return new JSObject(raw).getString("detail", "");
                } catch (Exception ignored) {
                    return "";
                }
            }
            return raw.length() > 160 ? raw.substring(0, 160) : raw;
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String cleanMimeType(String rawContentType) {
        if (rawContentType == null) return "";
        String cleaned = rawContentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        return "application/octet-stream".equals(cleaned) ? "" : cleaned;
    }

    private static String resolveFilename(String disposition, String fallback, String mimeType, String kind) {
        String candidate = "";
        if (disposition != null) {
            Matcher utfMatcher = UTF8_FILENAME_PATTERN.matcher(disposition);
            if (utfMatcher.find()) {
                try {
                    candidate = URLDecoder.decode(utfMatcher.group(1), StandardCharsets.UTF_8.name());
                } catch (Exception ignored) {
                    candidate = utfMatcher.group(1);
                }
            } else {
                Matcher asciiMatcher = ASCII_FILENAME_PATTERN.matcher(disposition);
                if (asciiMatcher.find()) {
                    candidate = asciiMatcher.group(1);
                }
            }
        }
        if (candidate == null || candidate.trim().isEmpty()) {
            candidate = fallback != null ? fallback.trim() : "vidqr_media";
        }
        candidate = candidate.replaceAll("[\\\\/:*?\"<>|\\r\\n]+", "_").trim();
        if (candidate.isEmpty()) candidate = "vidqr_media";

        if (!candidate.contains(".")) {
            String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
            if (ext == null || ext.isEmpty()) {
                if ("image".equals(kind)) ext = "jpg";
                else if ("audio".equals(kind)) ext = "mp3";
                else ext = "mp4";
            }
            candidate = candidate + "." + ext;
        }
        return candidate;
    }

    private static String ensureMimeType(String mimeType, String filename, String kind) {
        if (mimeType != null && !mimeType.isEmpty()) return mimeType;
        String ext = extractExtension(filename, kind);
        String mapped = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
        if (mapped != null && !mapped.isEmpty()) return mapped;
        String guessed = URLConnection.guessContentTypeFromName(filename);
        if (guessed != null && !guessed.isEmpty()) return guessed;
        if ("image".equals(kind)) return "image/jpeg";
        if ("audio".equals(kind)) return "audio/mpeg";
        return "video/mp4";
    }

    private static String resolveKind(String mimeType, String filename, String requestedKind) {
        if (mimeType.startsWith("image/") || "image".equals(requestedKind)) return "image";
        if (mimeType.startsWith("audio/") || "audio".equals(requestedKind)) return "audio";
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp") || lower.endsWith(".gif")) {
            return "image";
        }
        if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".wav") || lower.endsWith(".aac")) {
            return "audio";
        }
        return "video";
    }

    private static String extractExtension(String filename, String kind) {
        int dot = filename.lastIndexOf('.');
        if (dot >= 0 && dot < filename.length() - 1) {
            return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
        }
        if ("image".equals(kind)) return "jpg";
        if ("audio".equals(kind)) return "mp3";
        return "mp4";
    }
}
