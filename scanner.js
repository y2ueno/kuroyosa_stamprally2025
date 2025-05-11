// scanner.js

// --- Configuration ---
// GAS Web Appのデプロイ済みURLを設定 (必ず実際のURLに置き換えてください)
// 新しいデプロイメントURL: https://script.google.com/macros/s/AKfycbwtnySgVBvIfyjkyEy2vtGeKcLUi9ZqOVTp8eUNzWryy7CNtZYjMwe0hXF1K9Oyuh6cSA/exec
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwtnySgVBvIfyjkyEy2vtGeKcLUi9ZqOVTp8eUNzWryy7CNtZYjMwe0hXF1K9Oyuh6cSA/exec";
// -------------------

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
        }
    }
}

/**
 * Google Apps Script Web Appにデータを送信する非同期関数 (x-www-form-urlencoded)
 * @param {string} email ユーザーのメールアドレス
 * @param {string} qrData スキャンされたQRコードデータ
 * @param {string} gasWebAppUrl GAS Web AppのURL
 */
async function sendDataToSheet(email, qrData, gasWebAppUrl) {
  // 送信するデータをURLSearchParamsで構築
  const formData = new URLSearchParams();
  formData.append('email', email);
  formData.append('qrData', qrData);
  formData.append('scannedAt', new Date().toISOString()); // クライアント側のスキャン時刻も送信

  console.log("送信データ (form-urlencoded):", formData.toString());
  console.log("送信先URL:", gasWebAppUrl);

  updateResultsDisplay('サーバーに送信中...', 'info');

  try {
    const response = await fetch(gasWebAppUrl, {
      method: 'POST',
      headers: {
        // 'Content-Type': 'application/x-www-form-urlencoded', // URLSearchParams を使う場合、ブラウザが自動で設定することが多いが、明示しても良い
      },
      body: formData, // URLSearchParamsオブジェクトを直接bodyに指定
      // mode: 'cors', // GAS側でCORS設定が正しければ不要。
      redirect: 'follow'
    });

    const responseBodyText = await response.text();

    if (!response.ok) {
      console.error(`HTTPエラー! ステータス: ${response.status}, ボディ: ${responseBodyText}`);
      throw new Error(`サーバーとの通信に失敗しました (ステータス: ${response.status})。`);
    }

    let result;
    try {
        result = JSON.parse(responseBodyText);
    } catch (parseError) {
        console.error("サーバーからのJSON応答の解析に失敗:", responseBodyText, parseError);
        throw new Error("サーバーからの応答が予期しない形式でした。");
    }

    console.log('サーバーからのレスポンス:', result);

    if (result && result.status === 'success') {
        alert('スタンプが正常に記録されました！\nQR内容: ' + qrData);
        updateResultsDisplay(`記録成功: ${qrData}`, 'success');
    } else {
        const errorMessage = result && result.message ? result.message : "サーバー側で処理に失敗しました。";
        console.error('サーバーサイド処理エラー:', errorMessage, result);
        throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('データ送信エラー:', error);
    alert('スタンプ記録エラー:\n' + error.message + "\nQR内容: " + qrData + "\n開発者に連絡してください。");
    updateResultsDisplay(`送信エラー: ${qrData}`, 'error');
  }
}


/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 * @param {string} decodedText デコードされたテキストデータ
 * @param {object} decodedResult 詳細なデコード結果オブジェクト
 */
function onScanSuccess(decodedText, decodedResult) {
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);
    updateResultsDisplay(`スキャン結果: ${decodedText}`, 'info');

    const userEmail = getQueryParam('email');

    if (!userEmail) {
        const errorMsg = "エラー: 参加者情報（メールアドレス）が見つかりません。ページのURLを確認してください。";
        console.error(errorMsg);
        alert(errorMsg);
        updateResultsDisplay('エラー: メールアドレス未設定', 'error');
        return;
    }

    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") { // YOUR_GAS_WEB_APP_URL_HERE は初期値のプレースホルダ
         const errorMsg = "エラー: 送信先システムが設定されていません。開発者に連絡してください。";
         console.error(errorMsg);
         alert(errorMsg);
         updateResultsDisplay('エラー: 送信先未設定', 'error');
         return;
    }

    sendDataToSheet(userEmail, decodedText, GAS_WEB_APP_URL);
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
        } else {
            userEmailDisplay.innerText = '参加者情報なし (URLに ?email=... が必要)';
            userEmailDisplay.style.color = 'red';
            alert("参加者のメールアドレスがURLに含まれていません。\nスタンプラリーのリンクを確認してください。\n(例: .../index.html?email=your_email@example.com)");
        }
    }

    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") {
        const errorMsg = "警告: アプリケーションの送信先URLが設定されていません。scanner.jsファイル内のGAS_WEB_APP_URLを更新してください。";
        console.warn(errorMsg);
        updateResultsDisplay(errorMsg, 'error');
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
            fps: 10,
            qrbox: (viewportWidth, viewportHeight) => {
                const edgePercentage = 0.8;
                const minEdgeSize = Math.min(viewportWidth, viewportHeight);
                let qrboxSize = Math.floor(minEdgeSize * edgePercentage);
                qrboxSize = Math.min(qrboxSize, 250);
                qrboxSize = Math.max(qrboxSize, 100);
                return { width: qrboxSize, height: qrboxSize};
            },
            rememberLastUsedCamera: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});
