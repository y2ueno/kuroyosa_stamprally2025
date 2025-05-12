// scanner.js

// --- Configuration ---
// ★★★重要★★★: Google Apps Scriptのウェブアプリを「新しいデプロイ」でデプロイし、
// 発行されたウェブアプリのURLを以下の "" の中に正確に貼り付けてください。
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzf-gHktpFxekqxhy7Osuc_rP3NtoHAxD9xE17dp9XI1KTutJxUsoJ3SbBuWP0oK8J4Ow/exec";
// 例: "https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec";
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
        } else {
            resultsEl.classList.add('info');
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
  const formData = new URLSearchParams();
  formData.append('email', email);
  formData.append('qrData', qrData);
  formData.append('scannedAt', new Date().toISOString()); // クライアント側のスキャン時刻

  console.log("送信データ (form-urlencoded):", formData.toString());
  console.log("送信先URL:", gasWebAppUrl);

  updateResultsDisplay('サーバーに送信中...', 'info');

  try {
    const response = await fetch(gasWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: formData.toString(),
      redirect: 'follow', // リダイレクトを追従
    });

    const responseBodyText = await response.text();
    console.log("サーバーからの生レスポンステキスト:", responseBodyText);

    if (!response.ok) {
      // HTTPステータスコードが200-299の範囲外の場合
      console.error(`HTTPエラー! ステータス: ${response.status}, ボディ: ${responseBodyText}`);
      throw new Error(`サーバーとの通信に失敗 (ステータス: ${response.status})。応答: ${responseBodyText.substring(0,100)}...`);
    }

    if (!responseBodyText) {
        console.error("サーバーからの応答が空でした。");
        throw new Error("サーバーから空の応答がありました。");
    }

    let result;
    try {
        result = JSON.parse(responseBodyText);
    } catch (parseError) {
        console.error("サーバーからのJSON応答の解析に失敗:", responseBodyText, parseError);
        throw new Error(`サーバーからの応答をJSONとして解析できませんでした。内容: ${responseBodyText.substring(0, 100)}...`);
    }

    console.log('サーバーからのパース済みレスポンス:', result);

    if (result && result.status === 'success') {
        alert('スタンプが正常に記録されました！\nQR内容: ' + qrData);
        updateResultsDisplay(`記録成功: ${qrData}`, 'success');
    } else {
        const errorMessage = result && result.message ? result.message : "サーバー側で処理に失敗したか、予期しない応答がありました。";
        console.error('サーバーサイド処理エラーまたは予期しない応答:', errorMessage, result);
        throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('データ送信処理エラー (sendDataToSheet catch):', error.name, error.message, error.stack);
    alert(`スタンプ記録エラーが発生しました。\nエラー: ${error.message}\nQR内容: ${qrData}\nインターネット接続を確認するか、開発者に連絡してください。`);
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

    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "ここに新しいデプロイで取得したGASのウェブアプリURLを貼り付け" || GAS_WEB_APP_URL.trim() === "") {
         const errorMsg = "エラー: 送信先システムが正しく設定されていません。開発者に連絡してください。";
         console.error(errorMsg, "Current GAS_WEB_APP_URL:", `"${GAS_WEB_APP_URL}"`);
         alert(errorMsg);
         updateResultsDisplay('エラー: 送信先URL未設定', 'error');
         return;
    }

    sendDataToSheet(userEmail, decodedText, GAS_WEB_APP_URL);
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 * @param {string} error エラーメッセージ (通常は無視してOK)
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

    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "ここに新しいデプロイで取得したGASのウェブアプリURLを貼り付け" || GAS_WEB_APP_URL.trim() === "") {
        const errorMsg = "警告: アプリケーションの送信先URLが設定されていません。scanner.jsファイル内のGAS_WEB_APP_URLを更新してください。";
        console.warn(errorMsg);
        updateResultsDisplay(errorMsg, 'error');
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", // スキャナーUIを埋め込むHTML要素のID
        {
            fps: 10, // スキャン頻度 (フレーム/秒)
            qrbox: (viewportWidth, viewportHeight) => { // スキャン領域のサイズを動的に設定
                const edgePercentage = 0.7; // ビューポートに対する割合
                const minEdgeSize = Math.min(viewportWidth * edgePercentage, viewportHeight * edgePercentage, 300); // 最大300px
                return { width: Math.max(minEdgeSize, 150), height: Math.max(minEdgeSize, 150) }; // 最小150px
            },
            rememberLastUsedCamera: true, // 最後に使用したカメラを記憶
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] // ファイルからのスキャンを無効化
        },
        /* verbose= */ false // 詳細なログ出力を無効にする場合はfalse
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});
