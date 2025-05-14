// scanner.js (複数回実行防止対策強化・Bearerトークン認証付き Webhook連携版)

/**
 * ★★★ Glideで生成されたWebhook URL ★★★
 */
const GLIDE_WEBHOOK_URL = 'https://go.glideapps.com/api/container/plugin/webhook-trigger/b2Ps68iDJmpTVBfsXJdE/dc48b760-8e91-4c32-a36a-3471c2b2207b';

/**
 * ★★★ Glide Webhook 用の Bearer トークン ★★★
 * 重要: このトークンは機密情報です。クライアントサイドに直接記述する場合のセキュリティリスクを理解してください。
 */
const GLIDE_BEARER_TOKEN = 'fe82b0fd-b112-498a-b357-1d27d9665441';

// グローバル変数としてスキャナーインスタンスと処理中フラグを保持
let html5QrcodeScannerInstance = null;
let isProcessingScan = false; // スキャン処理中を示すフラグ

/**
 * URLクエリパラメータを取得するヘルパー関数
 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 結果表示エリアを更新する関数
 */
function updateResultsDisplay(message, type = 'info') {
    const resultsEl = document.getElementById('qr-reader-results');
    if (resultsEl) {
        resultsEl.innerText = message;
        resultsEl.className = 'qr-reader-results'; // Reset classes
        if (type === 'success') {
            resultsEl.classList.add('success');
        } else if (type === 'error') {
            resultsEl.classList.add('error');
        } else {
            resultsEl.classList.add('info');
        }
        resultsEl.style.display = 'flex';
    }
}

/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 */
async function onScanSuccess(decodedText, decodedResult) {
    if (isProcessingScan) {
        console.log("現在処理中のため、新たなスキャン結果は無視します。");
        return;
    }
    isProcessingScan = true; // 処理開始、フラグを立てる
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);
    updateResultsDisplay(`QRコード認識: ${decodedText}`, 'info');

    // スキャン成功後、すぐにスキャナーを停止して多重実行を防ぐ
    if (html5QrcodeScannerInstance && html5QrcodeScannerInstance.getState() === Html5QrcodeScannerState.SCANNING) {
        try {
            await html5QrcodeScannerInstance.clear(); // スキャナーをクリア（停止）
            console.log("スキャナーを停止しました。");
        } catch (err) {
            console.error("スキャナーの停止に失敗:", err);
            // 停止に失敗しても処理を続行するが、ログには残す
        }
    }

    const userEmail = getQueryParam('email');
    const scannedAt = new Date().toISOString();

    if (!userEmail) {
        const errorMsg = "エラー: 参加者情報（メールアドレス）がURLパラメータから取得できませんでした。";
        console.error(errorMsg);
        alert(errorMsg + "\n再度、スタンプラリー画面を開き直してください。");
        updateResultsDisplay('エラー: メールアドレス未設定。QRをスキャンできません。', 'error');
        isProcessingScan = false; // エラーなのでフラグを戻す
        return;
    }

    if (!GLIDE_WEBHOOK_URL || GLIDE_WEBHOOK_URL === 'YOUR_GLIDE_GENERATED_WEBHOOK_URL_HERE') {
        const errorMsg = "エラー: Webhook URLが正しく設定されていません。システム管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: システム設定不備 (Webhook URL未設定)', 'error');
        isProcessingScan = false;
        return;
    }

    if (!GLIDE_BEARER_TOKEN) {
        const errorMsg = "エラー: 認証トークンが設定されていません。システム管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: システム設定不備 (認証トークン未設定)', 'error');
        isProcessingScan = false;
        return;
    }

    const dataToSend = {
        email: userEmail,
        qrData: decodedText,
        scannedTimestamp: scannedAt
    };

    updateResultsDisplay(`「${decodedText}」をアプリに記録中...`, 'info');

    try {
        const response = await fetch(GLIDE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GLIDE_BEARER_TOKEN}`
            },
            body: JSON.stringify(dataToSend)
        });

        if (response.ok) {
            console.log('Webhookへのデータ送信成功: Status ' + response.status);
            updateResultsDisplay(`スタンプ「${decodedText}」を記録しました！`, 'success');
            alert(`スタンプ情報「${decodedText}」を記録しました。`);
            // 成功後、ページ更新を促すメッセージを表示
            setTimeout(() => {
                updateResultsDisplay('記録が完了しました。続けてスキャンするにはページを更新してください。', 'info');
            }, 2000); // 2秒後にメッセージ変更
        } else {
            const errorText = await response.text();
            console.error(`Webhookへのデータ送信失敗: Status ${response.status}`, errorText);
            if (response.status === 401) {
                updateResultsDisplay(`エラー: 認証に失敗 (コード: ${response.status})。トークンを確認してください。`, 'error');
                alert(`エラー: スタンプ記録失敗 (認証エラー: ${response.status})。\n内容: ${errorText}\n認証トークンを確認してください。`);
            } else {
                updateResultsDisplay(`エラー: 記録失敗 (サーバーエラー: ${response.status})。`, 'error');
                alert(`エラー: スタンプ記録失敗 (サーバーエラー: ${response.status})。\n内容: ${errorText}\n時間をおいて再度お試しください。`);
            }
        }
    } catch (error) {
        console.error('Webhook送信中にネットワークエラー:', error);
        updateResultsDisplay('エラー: 記録失敗 (ネットワーク接続エラー)。', 'error');
        alert('エラー: スタンプ記録中にネットワーク接続の問題が発生しました。\n通信環境の良い場所で再度お試しください。');
    } finally {
        // isProcessingScan = false; // ページ更新を促すため、ここではフラグを戻さない。
                                  // もしページ更新なしで連続スキャンさせたい場合は、ここで戻す。
                                  // ただし、その場合はスキャナーの再開処理も必要。
                                  // 現状は「ページ更新で再スキャン」の運用。
    }
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 */
function onScanFailure(error) {
    // console.warn(`コードスキャンエラー = ${error}`); // デバッグ時以外はコメントアウト推奨
}

// HTMLドキュメントの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', (event) => {
    const userEmailDisplay = document.getElementById('user-email-display');
    const userEmail = getQueryParam('email');
    console.log("ページ読み込み完了。ユーザー:", userEmail);

    if (userEmailDisplay) {
        if (userEmail) {
            userEmailDisplay.innerText = `参加者: ${userEmail}`;
            userEmailDisplay.style.color = '#3f51b5';
        } else {
            userEmailDisplay.innerText = '参加者情報なし (URLに ?email=... が必要)';
            userEmailDisplay.style.color = 'red';
            alert("参加者のメールアドレスがURLパラメータに含まれていません。\nスタンプラリーのリンクを確認してください。\n(例: .../index.html?email=your_email@example.com)");
            updateResultsDisplay('エラー: メールアドレスが設定されていません。QRコードをスキャンできません。', 'error');
            return;
        }
    } else {
        console.warn("ID 'user-email-display' の要素が見つかりません。");
    }

    try {
        // スキャナーインスタンスをグローバル変数に格納
        html5QrcodeScannerInstance = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: (viewportWidth, viewportHeight) => {
                    const edgePercentage = 0.7;
                    const minEdgeSize = Math.min(viewportWidth * edgePercentage, viewportHeight * edgePercentage, 300);
                    return { width: Math.max(minEdgeSize, 200), height: Math.max(minEdgeSize, 200) };
                },
                rememberLastUsedCamera: true,
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
            },
            false
        );
        html5QrcodeScannerInstance.render(onScanSuccess, onScanFailure);
        isProcessingScan = false; // スキャナー描画後、処理フラグを初期化
        updateResultsDisplay('QRコードをカメラにかざしてください', 'info');

    } catch (scannerError) {
        console.error("Html5QrcodeScanner の初期化に失敗:", scannerError);
        updateResultsDisplay('エラー: QRスキャナーの起動に失敗しました。カメラの許可などを確認してください。', 'error');
        alert('QRスキャナーの起動に失敗しました。\nブラウザのカメラへのアクセス許可設定を確認してください。');
    }
});
