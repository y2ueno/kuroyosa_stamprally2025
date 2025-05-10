//scanner.js

// QRスキャナーからのスキャンデータオブジェクトを想定
// 例：{ qrValue: "https://example.com/stamp/123", deviceId: "scanner001" }
const gasWebAppUrl = 'ここに実際のGAS /exec URLを置き換えてください';

async function sendDataToGAS_FormUrlEncoded(dataPayload) {
    const formData = new URLSearchParams();
    // dataPayloadオブジェクトからformDataを生成
    for (const key in dataPayload) {
        if (dataPayload.hasOwnProperty(key)) {
            formData.append(key, dataPayload[key]);
        }
    }

    try {
        const response = await fetch(gasWebAppUrl, {
            method: 'POST',
            // 'Content-Type'ヘッダーは、ボディがURLSearchParamsオブジェクトの場合、
            // ブラウザによって自動的に'application/x-www-form-urlencoded;charset=UTF-8'に設定されます。
            // 明示的な設定は通常不要ですが、明確にするために行うこともできます：
            // headers: {
            //   'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            // },
            body: formData,
            redirect: 'follow' // GASウェブアプリには不可欠
        });

        if (!response.ok) {
            // response.okはステータスが200-299の場合にtrue
            // これは、GAS自体が処理後（または処理失敗後）に返すHTTPエラーをキャッチします
            const errorText = await response.text(); // 可能であればレスポンスボディから詳細を取得
            console.error(`GAS HTTP Error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`サーバーがステータスで応答しました： ${response.status}. 詳細： ${errorText}`);
        }

        // GASが成功/失敗を示すテキストまたはJSONレスポンスを返すと仮定
        const responseData = await response.text(); // またはGASがJSONを返す場合はresponse.json()
        console.log('GASへのデータ送信に成功しました（form-urlencoded）。レスポンス：', responseData);
        // GASからのレスポンスを処理するための追加ロジックをここに追加します（例：UIの更新）
        return responseData;

    } catch (error) {
        // これはネットワークエラー（例：DNS障害、サーバー到達不能）
        // または!response.okブロックからスローされたエラーをキャッチします。
        console.error('GASへのデータ送信エラー（form-urlencoded）：', error);
        // ここにユーザー向けのエラー処理を追加します
        throw error; // コールスタックのさらに上で処理したい場合は再スローします
    }
}

// 使用例：
// const scannedDataObject = { qrData: "some_qr_value", scannedAt: new Date().toISOString() };
// sendDataToGAS_FormUrlEncoded(scannedDataObject)
//  .then(result => console.log("GAS呼び出し成功。"))
//  .catch(err => console.log("GAS呼び出し失敗。"));`
