// scanner.js (Bearerトークン認証付き Webhook連携版)

/**
 * ★★★ Glideで生成されたWebhook URL ★★★
 */
const GLIDE_WEBHOOK_URL = 'https://go.glideapps.com/api/container/plugin/webhook-trigger/b2Ps68iDJmpTVBfsXJdE/dc48b760-8e91-4c32-a36a-3471c2b2207b';

/**
 * ★★★ Glide Webhook 用の Bearer トークン ★★★
 * 重要: このトークンは機密情報です。クライアントサイドに直接記述する場合のセキュリティリスクを理解してください。
 */
const GLIDE_BEARER_TOKEN = 'fe82b0fd-b112-498a-b357-1d27d9665441';


/**
 * URLクエリパラメータを取得するヘルパー関数
 * @param {string} name 取得したいパラメータ名
 * @returns {string|null} パラメータの値、または見つからない場合はnull
 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * 結果表示エリアを更新する関数
 * @param {string} message 表示するメッセージ
 * @param {'info'|'success'|'error'} type メッセージの種類
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
 * 読み取ったデータをGlideのWebhookに送信します。
 * @param {string} decodedText デコードされたテキストデータ (QRコードの内容)
 * @param {object} decodedResult 詳細なデコード結果オブジェクト
 */
async function onScanSuccess(decodedText, decodedResult) {
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);
    updateResultsDisplay(`QRコード読取成功: ${decodedText}`, 'info');

    const userEmail = getQueryParam('email');
    const scannedAt = new Date().toISOString(); // スキャン時刻 (ISO 8601形式 UTC)

    if (!userEmail) {
        const errorMsg = "エラー: 参加者情報（メールアドレス）がURLパラメータから取得できませんでした。";
        console.error(errorMsg);
        alert(errorMsg + "\n再度、スタンプラリー画面を開き直してください。");
        updateResultsDisplay('エラー: メールアドレス未設定。QRをスキャンできません。', 'error');
        if (window.html5QrcodeScannerInstance) {
             window.html5QrcodeScannerInstance.clear().catch(err => console.error("スキャナーの停止に失敗:", err));
        }
        return;
    }

    if (!GLIDE_WEBHOOK_URL || GLIDE_WEBHOOK_URL === 'YOUR_GLIDE_GENERATED_WEBHOOK_URL_HERE') { // 初期値チェック
        const errorMsg = "エラー: Webhook URLが正しく設定されていません。システム管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: システム設定不備 (Webhook URL未設定)', 'error');
        return;
    }

    if (!GLIDE_BEARER_TOKEN) { // Bearerトークンの存在チェック
        const errorMsg = "エラー: 認証トークンが設定されていません。システム管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: システム設定不備 (認証トークン未設定)', 'error');
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
                'Authorization': `Bearer ${GLIDE_BEARER_TOKEN}` // Bearerトークンをヘッダーに追加
            },
            body: JSON.stringify(dataToSend)
        });

        if (response.ok) {
            console.log('Webhookへのデータ送信成功: Status ' + response.status);
            updateResultsDisplay(`スタンプ「${decodedText}」を記録しました！`, 'success');
            alert(`スタンプ情報「${decodedText}」を記録しました。\n続けて他のQRコードもスキャンできます。`);

            if (window.html5QrcodeScannerInstance) {
                try {
                    await window.html5QrcodeScannerInstance.clear();
                    console.log("スキャナーをクリアしました。");
                     setTimeout(() => {
                        updateResultsDisplay('スキャンが完了しました。再度スキャンするにはページを更新してください。', 'info');
                    }, 1500);
                } catch (err) {
                    console.error("スキャナーのクリアに失敗:", err);
                }
            }
        } else {
            const errorText = await response.text(); // エラー内容をテキストで取得
            console.error(`Webhookへのデータ送信失敗: Status ${response.status}`, errorText);
            // 401エラーの場合はトークンに関するメッセージを強調
            if (response.status === 401) {
                 updateResultsDisplay(`エラー: 認証に失敗しました (コード: ${response.status})。トークンを確認してください。`, 'error');
                 alert(`エラー: スタンプの記録に失敗しました (認証エラー: ${response.status})。\n内容: ${errorText}\n設定された認証トークンが正しいか確認してください。`);
            } else {
                updateResultsDisplay(`エラー: 記録に失敗しました (サーバーエラー: ${response.status})。`, 'error');
                alert(`エラー: スタンプの記録に失敗しました (サーバーエラー: ${response.status})。\n内容: ${errorText}\n時間をおいて再度お試しください。`);
            }
        }
    } catch (error) {
        console.error('Webhook送信中にネットワークエラー:', error);
        updateResultsDisplay('エラー: 記録に失敗しました (ネットワーク接続エラー)。', 'error');
        alert('エラー: スタンプの記録中にネットワーク接続の問題が発生しました。\n通信環境の良い場所で再度お試しください。');
    }
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 * @param {string} error エラーメッセージ
 */
function onScanFailure(error) {
    // console.warn(`コードスキャンエラー = ${error}`);
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
        window.html5QrcodeScannerInstance = new Html5QrcodeScanner(
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
        window.html5QrcodeScannerInstance.render(onScanSuccess, onScanFailure);
        updateResultsDisplay('QRコードをカメラにかざしてください', 'info');

    } catch (scannerError) {
        console.error("Html5QrcodeScanner の初期化に失敗:", scannerError);
        updateResultsDisplay('エラー: QRスキャナーの起動に失敗しました。カメラの許可などを確認してください。', 'error');
        alert('QRスキャナーの起動に失敗しました。\nブラウザのカメラへのアクセス許可設定を確認してください。');
    }
});
