// scanner.js

/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 * @param {string} decodedText デコードされたテキストデータ
 * @param {object} decodedResult 詳細なデコード結果オブジェクト
 */
function onScanSuccess(decodedText, decodedResult) {
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);
    // ** TODO: デコードされたテキスト(decodedText)をGlideに送信する (セクションV参照) **
    document.getElementById('qr-reader-results').innerText = `スキャン結果: ${decodedText}`;
    // スキャナーを停止する場合の処理（必要なら実装）
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 * @param {string} error エラーメッセージ
 */
function onScanFailure(error) {
    // console.warn(`コードスキャンエラー = ${error}`);
}

// ==== ここから追加 ====
// HTMLドキュメントの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', (event) => {
// ==== ここまで追加 ====

    // Html5QrcodeScannerのインスタンスを作成
    // DOMContentLoaded内で宣言した場合、onScanSuccessから直接 clear() できない点に注意
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", // スキャナーUIを埋め込むHTML要素のID	
        {
            fps: 10, // スキャン頻度 (フレーム/秒)
            qrbox: { width: 250, height: 250 }, // スキャン領域のサイズ (ビューファインダー)
        },
        /* verbose= */ false // 詳細なログ出力を無効にする場合はfalse
    );

    // スキャナーを描画し、スキャンを開始する
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);

// ==== ここから追加 ====
});
// ==== ここまで追加 ====