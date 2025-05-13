// scanner.js (Webhook連携版)

/**
 * ★★★ Glideで生成されたWebhook URLをここに設定してください ★★★
 */
const GLIDE_WEBHOOK_URL = 'https://go.glideapps.com/api/container/plugin/webhook-trigger/b2Ps68iDJmpTVBfsXJdE/dc48b760-8e91-4c32-a36a-3471c2b2207b'; // 例: https://hooks.glideapps.com/xxxxxxxx

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
    const scannedAt = new Date().toISOString(); // スキャン時刻 (ISO 8601形式)

    if (!userEmail) {
        const errorMsg = "エラー: 参加者情報（メールアドレス）がURLパラメータから取得できませんでした。";
        console.error(errorMsg);
        alert(errorMsg + "\n再度、スタンプラリー画面を開き直してください。");
        updateResultsDisplay('エラー: メールアドレス未設定', 'error');
        if (window.html5QrcodeScannerInstance) {
             window.html5QrcodeScannerInstance.clear().catch(err => console.error("スキャナーの停止に失敗:", err));
        }
        return;
    }

    if (!GLIDE_WEBHOOK_URL || GLIDE_WEBHOOK_URL === 'https://YOUR_GLIDE_GENERATED_WEBHOOK_URL_HERE') {
        const errorMsg = "エラー: Webhook URLが設定されていません。管理者にお問い合わせください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: 設定不備（Webhook URL未設定）', 'error');
        return;
    }

    // GlideのWebhookに送信するデータ
    const dataToSend = {
        email: userEmail,       // ユーザーのメールアドレス
        qrData: decodedText,    // スキャンしたQRコードの内容
        scannedTimestamp: scannedAt // スキャンした日時
        // 必要に応じて他のデータもここに追加できます
    };

    updateResultsDisplay(`「${decodedText}」を送信中...`, 'info');

    try {
        const response = await fetch(GLIDE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });

        if (response.ok) {
            const responseData = await response.json(); // Glide側からの応答を期待する場合
            console.log('Webhookへのデータ送信成功:', responseData);
            updateResultsDisplay(`「${decodedText}」をアプリに送信しました。`, 'success');
            alert(`スタンプ情報「${decodedText}」をアプリに送信しました。\nアプリが自動で記録します。`);

            if (window.html5QrcodeScannerInstance) {
                window.html5QrcodeScannerInstance.clear().catch(err => {
                    console.error("スキャナーの停止に失敗:", err);
                });
                setTimeout(() => {
                     updateResultsDisplay('スキャンを停止しました。再度スキャンするにはページを更新してください。', 'info');
                }, 500);
            }
        } else {
            const errorText = await response.text();
            console.error('Webhookへのデータ送信失敗:', response.status, errorText);
            updateResultsDisplay(`エラー: アプリとの連携に失敗しました (${response.status})。`, 'error');
            alert(`エラー: アプリケーションとの連携中に問題が発生しました (ステータス: ${response.status})。\n${errorText}`);
        }
    } catch (error) {
        console.error('Webhook送信中にネットワークエラー:', error);
        updateResultsDisplay('エラー: アプリとの連携に失敗しました (ネットワークエラー)。', 'error');
        alert('エラー: アプリケーションとの連携中にネットワークの問題が発生しました。通信環境の良い場所でお試しください。');
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
            return; // メールアドレスがない場合はスキャナーを初期化しない
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
        updateResultsDisplay('QRコードをスキャンしてください', 'info');
    } catch (scannerError) {
        console.error("Html5QrcodeScanner の初期化に失敗:", scannerError);
        updateResultsDisplay('エラー: QRスキャナーの起動に失敗しました。カメラの許可を確認してください。', 'error');
        alert('QRスキャナーの起動に失敗しました。\nカメラへのアクセスが許可されているか確認してください。');
    }
});
