// scanner.js (概念例)

/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 * @param {string} decodedText デコードされたテキストデータ
 * @param {object} decodedResult 詳細なデコード結果オブジェクト
 */
function onScanSuccess(decodedText, decodedResult) {
    // コンソールにログを出力 (デバッグ用)
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);

    // ** TODO: デコードされたテキスト(decodedText)をGlideに送信する (セクションV参照) **
    // ここで、セクションVで解説するいずれかの方法を用いてデータをGlideに送信する処理を実装する。

    // ユーザーにスキャン結果を表示 (任意)
    document.getElementById('qr-reader-results').innerText = `スキャン結果: ${decodedText}`;

    // オプション: スキャン成功後にスキャナーを停止する場合
    // html5QrcodeScanner.clear().catch(error => {
    //     console.error("スキャナーのクリアに失敗しました。", error);
    // });
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 * @param {string} error エラーメッセージ
 */
function onScanFailure(error) {
    // エラーをコンソールに警告として出力 (デバッグ用)
    // カメラが見つからない、権限がないなどの一般的なエラーが含まれる
    // console.warn(`コードスキャンエラー = ${error}`);
    // ユーザーにはより分かりやすいメッセージを表示することを検討
}

// Html5QrcodeScannerのインスタンスを作成
let html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader", // スキャナーUIを埋め込むHTML要素のID
    {
        fps: 10, // スキャン頻度 (フレーム/秒)
        qrbox: { width: 250, height: 250 }, // スキャン領域のサイズ (ビューファインダー)
        // supportedScanTypes: // カメラのみを使用する場合 (オプション)
    },
    /* verbose= */ false // 詳細なログ出力を無効にする場合はfalse
);

// スキャナーを描画し、スキャンを開始する
// 成功時と失敗時のコールバック関数を渡す
html5QrcodeScanner.render(onScanSuccess, onScanFailure);