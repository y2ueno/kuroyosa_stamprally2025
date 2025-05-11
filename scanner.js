// scanner.js

// 'gasWebAppUrl' は Google Apps Script のデプロイメント URL とします。
// 'dataToSend' は以下のような JavaScript オブジェクトとします。
// const dataToSend = {
//   scannedValue: "ABC123XYZ",
//   timestamp: new Date().toISOString(),
//   scannerId: "Scanner_001"
// };

async function sendDataToSheet(gasWebAppUrl, dataToSend) {
  console.log("Sending data to GAS:", dataToSend);

  try {
    const response = await fetch(gasWebAppUrl, {
      method: "POST",
      mode: "cors", // クロスオリジンリクエストには重要
      cache: "no-cache", // オプション: POST リクエストのキャッシュを防ぐため
      redirect: "follow", // GAS /exec URL には不可欠
      headers: {
        // 重要: GAS でのプリフライト OPTIONS リクエスト問題を回避するために text/plain を使用
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(dataToSend), // JS オブジェクトを文字列化
    });

    // レスポンスが ok (ステータスが 200-299 の範囲) かどうかを確認
    if (!response.ok) {
      // 可能であればレスポンスボディから詳細を取得
      let errorBody = "サーバーからのエラー詳細なし。";
      try {
        // GAS からのJSONエラーを期待する場合は response.json()
        errorBody = await response.text();
      } catch (parseError) {
        console.error("エラーレスポンスボディの解析に失敗:", parseError);
      }
      throw new Error(
        `HTTP error! Status: ${response.status}. Server says: ${errorBody}`
      );
    }

    // GAS が JSON を返すと仮定して解析 (GAS がプレーンテキストを返す場合は response.text())
    const result = await response.json();
    console.log("Success:", result);
    // 成功時の処理 (例: ユーザーに成功メッセージを表示)
    // 例: if (result.status === "success") { alert("データが送信されました！"); }

    return result; // GAS から解析された結果を返す

  } catch (error) {
    console.error("Google Apps Script へのデータ送信エラー:", error);
    // エラー処理 (例: ユーザーにエラーメッセージを表示)
    // alert(`エラー: ${error.message}`);
    throw error; // 呼び出し元のコードで処理する場合はエラーを再スロー
  }
}

// --- 使用例 ---
// const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMAFYgCUR6dgcKxN2QJcTd8LwdsZcMrExc78P0b6oX7qhvNwpie5oI0E_HeaRUFwBE/exec";
// const scannedData = {
//   barcode: "1234567890",
//   scanTime: new Date().toISOString(),
//   deviceId: "Scanner_Mobile_01"
// };
//
// sendDataToSheet(WEB_APP_URL, scannedData)
//  .then(gasResponse => {
//     console.log("GAS Response received:", gasResponse);
//     if (gasResponse && gasResponse.status === 'success') {
//       // UI を成功状態に更新
//       // alert("データ送信成功: " + gasResponse.message);
//     } else {
//       // gasResponse.message に基づいて UI を失敗状態に更新
//       // alert("データ送信失敗: " + (gasResponse? gasResponse.message : "不明なエラー"));
//     }
//   })
//  .catch(err => {
//     console.error("データ送信に失敗しました:", err);
//     // ネットワークエラーまたは重大な fetch エラーの場合に UI を更新
//     // alert("通信エラーが発生しました: " + err.message);
//   });
