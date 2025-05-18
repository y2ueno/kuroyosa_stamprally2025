// scanner.js (複数回実行防止対策強化・Bearerトークン認証付き Webhook連携版・有効QRコード判定追加版)

/**
 * ★★★ Glideで生成されたWebhook URL ★★★
 * GlideアプリのWebhookトリガーで生成されたURLに置き換えてください。
 */
const GLIDE_WEBHOOK_URL = 'https://go.glideapps.com/api/container/plugin/webhook-trigger/b2Ps68iDJmpTVBfsXJdE/dc48b760-8e91-4c32-a36a-3471c2b2207b'; // 例: 'https://go.glideapps.com/api/container/plugin/webhook-trigger/b2Ps68iDJmpTVBfsXJdE/dc48b760-8e91-4c32-a36a-3471c2b2207b'

/**
 * ★★★ Glide Webhook 用の Bearer トークン ★★★
 * GlideアプリのWebhook設定で確認できるBearerトークンに置き換えてください。
 * 重要: このトークンは機密情報です。クライアントサイドに直接記述する場合のセキュリティリスクを理解してください。
 */
const GLIDE_BEARER_TOKEN = 'fe82b0fd-b112-498a-b357-1d27d9665441'; // 例: 'fe82b0fd-b112-498a-b357-1d27d9665441'

/**
 * ★★★ 変更点 ★★★
 * あらかじめ用意したスポットと紐づけられた有効なQRコードのリスト。
 * このリストに登録されているQRコードのみが処理対象となります。
 * Glideのデータシートで管理している実際のコードに合わせて設定してください。
 * 例: ["SPOT_A_UNIQUE_CODE", "SPOT_B_XYZ", "EVENT_CODE_123"]
 */
const VALID_QR_CODES = [
    "4.3owGkqSReevJbsDJNJeQ",
    "1xRMJJBhR22V-iHlHuUnbg",
    "v3iHiurCQAqn4wpSVsEGiA",
    "nMdtEyNwSc6dCMwxuEQ3-w"
    // 必要に応じて、さらに有効なQRコードをこのリストに追加してください
];

// グローバル変数としてスキャナーインスタンスと処理中フラグを保持
let html5QrcodeScannerInstance = null;
let isProcessingScan = false; // スキャン処理中を示すフラグ

/**
 * URLクエリパラメータを取得するヘルパー関数
 * @param {string} name - 取得したいパラメータ名
 * @returns {string|null} パラメータの値、または存在しない場合はnull
 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 結果表示エリアを更新する関数
 * @param {string} message - 表示するメッセージ
 * @param {'info'|'success'|'error'|'warning'} type - メッセージの種類
 */
function updateResultsDisplay(message, type = 'info') {
    const resultsEl = document.getElementById('qr-reader-results');
    if (resultsEl) {
        resultsEl.innerText = message;
        resultsEl.className = 'qr-reader-results'; // 既存のクラスをリセット
        // タイプに応じてクラスを追加
        if (type === 'success') {
            resultsEl.classList.add('success');
        } else if (type === 'error') {
            resultsEl.classList.add('error');
        } else if (type === 'warning') {
            resultsEl.classList.add('warning');
        } else { // 'info' または未指定の場合
            resultsEl.classList.add('info');
        }
        resultsEl.style.display = 'flex'; // 表示を確実にする
    }
}

/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 * @param {string} decodedText - デコードされたQRコードのテキスト
 * @param {object} decodedResult - デコード結果の詳細オブジェクト
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

    /**
     * ★★★ 変更点 ★★★
     * スキャンされたQRコードが有効なリスト (VALID_QR_CODES) に含まれているか確認
     */
    if (!VALID_QR_CODES.includes(decodedText)) {
        const invalidQrMsg = `「${decodedText}」はスタンプラリー対象外のQRコードです。正しいQRコードをスキャンしてください。`;
        console.warn(invalidQrMsg);
        updateResultsDisplay(invalidQrMsg, 'warning'); // 'warning' タイプで表示
        alert(invalidQrMsg); // ユーザーにアラートで通知

        // 無効なQRコードの場合、ページ更新を促すメッセージを表示して終了
        setTimeout(() => {
            updateResultsDisplay('ページを更新して、対象のQRコードを再度スキャンしてください。', 'info');
        }, 3000); // 3秒後にメッセージ変更
        // isProcessingScan = false; // ここでフラグを戻すと連続スキャンが可能になるが、現状はページ更新を促す方針
        return; // 有効でない場合はここで処理を終了
    }

    // 有効なQRコードの場合のみ、以下の処理を続行
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

    if (!GLIDE_WEBHOOK_URL || GLIDE_WEBHOOK_URL === 'YOUR_GLIDE_GENERATED_WEBHOOK_URL_HERE' || GLIDE_WEBHOOK_URL.includes('YOUR_WEBHOOK_ID')) {
        const errorMsg = "エラー: Webhook URLが正しく設定されていません。システム管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: システム設定不備 (Webhook URL未設定)', 'error');
        isProcessingScan = false;
        return;
    }

    if (!GLIDE_BEARER_TOKEN || GLIDE_BEARER_TOKEN === 'YOUR_GLIDE_BEARER_TOKEN') {
        const errorMsg = "エラー: 認証トークンが設定されていません。システム管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: システム設定不備 (認証トークン未設定)', 'error');
        isProcessingScan = false;
        return;
    }

    const dataToSend = {
        email: userEmail,
        qrData: decodedText, // 有効なQRコードのみがここに到達する
        scannedTimestamp: scannedAt
    };

    updateResultsDisplay(`スタンプ「${decodedText}」をアプリに記録中...`, 'info');

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
            alert(`スタンプ「${decodedText}」を記録しました！`);
            // 成功後、ページ更新を促すメッセージを表示
            setTimeout(() => {
                updateResultsDisplay('記録が完了しました。続けてスキャンするにはページを更新してください。', 'info');
            }, 3000); // 3秒後にメッセージ変更
        } else {
            const errorText = await response.text();
            console.error(`Webhookへのデータ送信失敗: Status ${response.status}`, errorText);
            let displayErrorMsg = `エラー: スタンプ記録失敗 (サーバーエラー: ${response.status})。`;
            let alertErrorMsg = `エラー: スタンプ「${decodedText}」の記録に失敗しました (サーバーエラー: ${response.status})。\n内容: ${errorText}\n時間をおいて再度お試しください。`;

            if (response.status === 401) { // Unauthorized
                displayErrorMsg = `エラー: 認証に失敗しました (コード: ${response.status})。設定を確認してください。`;
                alertErrorMsg = `エラー: スタンプ「${decodedText}」の記録に失敗しました (認証エラー: ${response.status})。\n内容: ${errorText}\nシステム管理者に連絡して、認証トークンを確認してください。`;
            }
            updateResultsDisplay(displayErrorMsg, 'error');
            alert(alertErrorMsg);
        }
    } catch (error) {
        console.error('Webhook送信中にネットワークエラー:', error);
        updateResultsDisplay('エラー: 記録失敗 (ネットワーク接続エラー)。', 'error');
        alert('エラー: スタンプ記録中にネットワーク接続の問題が発生しました。\n通信環境の良い場所で再度お試しください。');
    } finally {
        // isProcessingScan = false; // ページ更新を促すため、ここではフラグを戻さない。
                                  // もしページ更新なしで連続スキャンさせたい場合は、ここでフラグを戻し、
                                  // スキャナーの再開処理 (例: html5QrcodeScannerInstance.render(...)) を呼び出す必要がある。
                                  // 現状は「ページ更新で再スキャン」の運用。
    }
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数 (現在はエラー内容の表示は抑制)
 * @param {string} error - エラーメッセージ
 */
function onScanFailure(error) {
    // console.warn(`コードスキャンエラー: ${error}`); // デバッグ時や詳細なログが必要な場合のみコメント解除
    // 通常運用時は、頻繁なエラー表示を避けるため、ここでは何もしないか、軽微な表示に留める
}

// HTMLドキュメントの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', (event) => {
    const userEmailDisplay = document.getElementById('user-email-display');
    const userEmail = getQueryParam('email');
    console.log("ページ読み込み完了。ユーザー:", userEmail || "未取得");

    if (userEmailDisplay) {
        if (userEmail) {
            userEmailDisplay.innerText = `参加者: ${userEmail}`;
            userEmailDisplay.style.color = '#3f51b5'; // 適宜スタイル調整
        } else {
            userEmailDisplay.innerText = '参加者情報がありません (URLに ?email=your_email@example.com のようにメールアドレスを指定してください)';
            userEmailDisplay.style.color = 'red';
            alert("参加者のメールアドレスがURLパラメータに含まれていません。\nスタンプラリーのリンクを確認してください。\n(例: .../index.html?email=your_email@example.com)");
            updateResultsDisplay('エラー: メールアドレスが設定されていません。QRコードをスキャンできません。', 'error');
            return; // メールアドレスがない場合はスキャナーを初期化しない
        }
    } else {
        console.warn("ID 'user-email-display' の要素が見つかりません。参加者メールアドレス表示エリアがHTMLにありません。");
    }

    // メールアドレスが取得できた場合のみスキャナーを初期化
    if (userEmail) {
        try {
            html5QrcodeScannerInstance = new Html5QrcodeScanner(
                "qr-reader", // QRコードリーダーを埋め込むHTML要素のID
                {
                    fps: 10, // 1秒あたりのスキャンフレーム数
                    qrbox: (viewportWidth, viewportHeight) => {
                        // スキャン領域のサイズをビューポートに基づいて動的に計算
                        const edgePercentage = 0.7; // ビューポートの70%
                        const minEdgeSize = Math.min(viewportWidth * edgePercentage, viewportHeight * edgePercentage, 300); // 最大でも300px
                        return { width: Math.max(minEdgeSize, 200), height: Math.max(minEdgeSize, 200) }; // 最小200px
                    },
                    rememberLastUsedCamera: true, // 最後に使用したカメラを記憶する
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] // カメラのみを使用
                },
                false // verboseMode: false (詳細ログをコンソールに出力しない)
            );
            html5QrcodeScannerInstance.render(onScanSuccess, onScanFailure);
            isProcessingScan = false; // スキャナー描画後、処理フラグを初期化
            updateResultsDisplay('QRコードをカメラにかざしてください', 'info');
        } catch (scannerError) {
            console.error("Html5QrcodeScanner の初期化に失敗:", scannerError);
            updateResultsDisplay('エラー: QRスキャナーの起動に失敗しました。カメラの許可などを確認してください。', 'error');
            alert('QRスキャナーの起動に失敗しました。\nブラウザのカメラへのアクセス許可設定を確認してください。または、別のブラウザでお試しください。');
        }
    }
});
