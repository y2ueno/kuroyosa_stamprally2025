// scanner.js

// --- Configuration ---
// GAS Web Appのデプロイ済みURLを設定
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMAFYgCUR6dgcKxN2QJcTd8LwdsZcMrExc78P0b6oX7qhvNwpie5oI0E_HeaRUFwBE/exec"; // あなたのGAS Web App URLに置き換えてください
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
 * Google Apps Script Web Appにデータを送信する非同期関数
 * @param {string} email ユーザーのメールアドレス
 * @param {string} qrData スキャンされたQRコードデータ
 * @param {string} gasWebAppUrl GAS Web AppのURL
 */
async function sendDataToSheet(email, qrData, gasWebAppUrl) {
  // クライアント側のスキャン時刻も送信する場合
  // const scannedAt = new Date().toISOString();
  // const dataToSend = { email: email, qrData: qrData, scannedAt: scannedAt };
  const dataToSend = { email: email, qrData: qrData }; // 今回はメールとQRデータのみ
  const jsonData = JSON.stringify(dataToSend);

  console.log("送信データ:", jsonData);
  console.log("送信先URL:", gasWebAppUrl);

  document.getElementById('qr-reader-results').innerText = 'サーバーに送信中...';

  try {
    const response = await fetch(gasWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // GAS側でJSONを期待するように修正
      },
      body: jsonData,
      redirect: 'follow' // リダイレクトを追従
      // mode: 'cors' // 通常、GAS Web Appが正しくCORS設定されていれば不要。問題発生時の切り分け用
    });

    const responseBodyText = await response.text(); // まずテキストとして取得

    if (!response.ok) {
      console.error(`HTTPエラー! ステータス: ${response.status}, ボディ: ${responseBodyText}`);
      throw new Error(`サーバーエラーが発生しました (ステータス: ${response.status})。詳細はコンソールを確認してください。`);
    }

    let result;
    try {
        result = JSON.parse(responseBodyText); // テキストをJSONとしてパース
    } catch (parseError) {
        console.error("サーバーからのJSON応答の解析に失敗:", responseBodyText, parseError);
        throw new Error("サーバーからの応答が予期しない形式です。");
    }

    console.log('成功レスポンス:', result);

    if (result && result.status === 'success') {
        alert('スタンプが正常に記録されました！');
        document.getElementById('qr-reader-results').innerText = `記録成功: ${qrData}`;
    } else {
        const errorMessage = result && result.message ? result.message : "サーバー側で処理に失敗しました。";
        console.error('サーバーサイド処理エラー:', result);
        throw new Error(errorMessage);
    }

  } catch (error) {
    console.error('データ送信エラー:', error);
    alert('スタンプ記録エラー: ' + error.message);
    document.getElementById('qr-reader-results').innerText = `スキャン結果: ${qrData} (送信エラー)`;
  }
}

/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 * @param {string} decodedText デコードされたテキストデータ
 * @param {object} decodedResult 詳細なデコード結果オブジェクト
 */
function onScanSuccess(decodedText, decodedResult) {
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);
    document.getElementById('qr-reader-results').innerText = `スキャン結果: ${decodedText}`;

    const userEmail = getQueryParam('email');

    if (!userEmail) {
        console.error("URLパラメータ 'email' が見つかりません。");
        alert("エラー: 参加者情報（メールアドレス）が見つかりません。ページのURLを確認してください。");
        document.getElementById('qr-reader-results').innerText = 'エラー: メールアドレス未設定';
        return;
    }

    if (!GAS_WEB_APP_URL || GAS_WEB_APP_URL === "YOUR_GAS_WEB_APP_URL_HERE") { // URLが初期値のままか確認
         console.error("GAS Web App URLがscanner.js内で正しく設定されていません。");
         alert("エラー: 送信先の設定が完了していません。開発者に連絡してください。");
         document.getElementById('qr-reader-results').innerText = 'エラー: 送信先未設定';
         return;
    }

    sendDataToSheet(userEmail, decodedText, GAS_WEB_APP_URL);

    // スキャナーを停止したい場合は、html5QrcodeScannerインスタンスをグローバルにするなどして
    // ここから clear() メソッドを呼び出せるようにする必要があります。
    // 例: if (window.html5QrcodeScanner) { window.html5QrcodeScanner.clear(); }
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数 (通常は無視してOK)
 * @param {string} error エラーメッセージ
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
        userEmailDisplay.innerText = userEmail ? `ユーザー: ${userEmail}` : 'ユーザー情報なし';
    }
    if (!userEmail) {
        alert("URLにメールアドレスが含まれていません。スタンプラリーのリンクを確認してください。(例: .../index.html?email=your_email@example.com)");
    }

    // window.html5QrcodeScanner のようにグローバルスコープにすることも検討 (onScanSuccessから停止する場合)
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            // supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] // カメラのみに限定する場合
        },
        /* verbose= */ false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});
