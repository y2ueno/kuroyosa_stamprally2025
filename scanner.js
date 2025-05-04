// scanner.js

// --- Configuration ---
// GAS Web Appのデプロイ済みURLを設定
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMAFYgCUR6dgcKxN2QJcTd8LwdsZcMrExc78P0b6oX7qhvNwpie5oI0E_HeaRUFwBE/exec";
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
  const dataToSend = { email: email, qrData: qrData };
  const jsonData = JSON.stringify(dataToSend);

  console.log("送信データ:", jsonData);
  console.log("送信先URL:", gasWebAppUrl);

  // ユーザーに処理中であることを示す（任意）
  document.getElementById('qr-reader-results').innerText = 'サーバーに送信中...';

  try {
    const response = await fetch(gasWebAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonData,
      redirect: 'follow' // 通常は不要だが念のため
      // mode: 'no-cors' // GAS Web Appが正しくCORS設定されていない場合、一時的に試すことがあるが、通常は不要
    });

    // レスポンスボディをテキストとして取得試行（エラー時も内容確認のため）
    const responseBodyText = await response.text();

    if (!response.ok) {
      // HTTPエラー（例: 404 Not Found, 500 Internal Server Error）
      console.error(`HTTPエラー! ステータス: ${response.status}, ボディ: ${responseBodyText}`);
      throw new Error(`サーバーエラーが発生しました (ステータス: ${response.status})。詳細はコンソールを確認してください。`);
    }

    // GASからのJSONレスポンスを期待してパース試行
    let result;
    try {
        result = JSON.parse(responseBodyText);
    } catch (parseError) {
        console.error("サーバーからのJSON応答の解析に失敗:", responseBodyText);
        // GAS側がJSONを返さない設定の場合でも、成功したとみなす場合があるかもしれない
        // ここではエラーとして扱う
        throw new Error("サーバーからの応答が予期しない形式です。");
    }

    console.log('成功レスポンス:', result);

    // GASからのレスポンスに基づいてフィードバックを改善 (GAS側が {status: 'success',...} を返す想定)
    if (result && result.status === 'success') {
        alert('スタンプが正常に記録されました！');
        // 成功したら結果表示を更新
        document.getElementById('qr-reader-results').innerText = `記録成功: ${qrData}`;
    } else {
        // GAS側でエラーが報告された場合 ({status: 'error', message: '...'})
        const errorMessage = result && result.message? result.message : "サーバー側で処理に失敗しました。";
        console.error('サーバーサイド処理エラー:', result);
        throw new Error(errorMessage);
    }

  } catch (error) {
    // ネットワークエラーまたは上記でthrowされたエラー
    console.error('データ送信エラー:', error);
    // Glide UIを更新（例: エラーメッセージ表示）
    alert('スタンプ記録エラー: ' + error.message);
    // エラー発生時は元のスキャン結果表示に戻すなど
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

    // 1. URLパラメータからメールアドレスを取得
    const userEmail = getQueryParam('email');

    // 2. メールアドレスが存在するか確認
    if (!userEmail) {
        console.error("URLパラメータ 'email' が見つかりません。");
        alert("エラー: 参加者情報（メールアドレス）が見つかりません。ページのURLを確認してください。");
        return; // メールアドレスがない場合は送信処理を中断
    }

    // 3. GAS Web App URLが設定されているか確認 (念のため)
    if (!GAS_WEB_APP_URL) {
         console.error("GAS Web App URLがscanner.js内で設定されていません。");
         alert("エラー: 送信先の設定が完了していません。開発者に連絡してください。");
         return; // URLがない場合は送信処理を中断
    }

    // 4. 取得したメールアドレスとQRコードデータをGASに送信
    sendDataToSheet(userEmail, decodedText, GAS_WEB_APP_URL);

    // --- オプション: スキャン成功後にスキャナーを停止する場合 ---
    // 現在のコードでは html5QrcodeScanner はDOMContentLoadedスコープ内にあるため、
    // ここから直接 clear() を呼び出すことはできません。
    // 停止が必要な場合は、html5QrcodeScanner の宣言をグローバルスコープに移動するなどの変更が必要です。
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 * @param {string} error エラーメッセージ
 */
function onScanFailure(error) {
    // スキャン中の「QRコードが見つからない」等のエラーは頻繁に発生するため、
    // 通常はコンソールへのログ出力は抑制するか、デバッグ時のみ有効にします。
    // console.warn(`コードスキャンエラー = ${error}`);
}

// HTMLドキュメントの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', (event) => {

    // URLからメールアドレスを取得（デバッグや表示用）
    const userEmail = getQueryParam('email');
    console.log("ページ読み込み完了 ユーザー:", userEmail);
    // 必要ならページ上にメールアドレスを表示
    // 例: document.getElementById('user-email-display').innerText = `ユーザー: ${userEmail}`;

    // Html5QrcodeScannerのインスタンスを作成
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", // スキャナーUIを埋め込むHTML要素のID
        {
            fps: 10, // スキャン頻度 (フレーム/秒)
            qrbox: { width: 250, height: 250 }, // スキャン領域のサイズ (ビューファインダー)
            // supportedScanTypes: // カメラのみ使用する場合
        },
        /* verbose= */ false // 詳細なログ出力を無効にする場合はfalse
    );

    // スキャナーを描画し、スキャンを開始する
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

});
