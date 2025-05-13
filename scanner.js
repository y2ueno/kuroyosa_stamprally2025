// scanner.js (window.parent.postMessage連携版)

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
        resultsEl.style.display = 'flex'; // Ensure it's visible
    }
}

/**
 * QRコードのスキャンが成功したときに呼び出されるコールバック関数
 * 読み取ったデータをGlideの親ページにpostMessageで送信します。
 * @param {string} decodedText デコードされたテキストデータ (QRコードの内容)
 * @param {object} decodedResult 詳細なデコード結果オブジェクト
 */
function onScanSuccess(decodedText, decodedResult) {
    console.log(`コード検出成功 = ${decodedText}`, decodedResult);
    updateResultsDisplay(`QRコード読取成功: ${decodedText}`, 'info');

    const userEmail = getQueryParam('email');
    const scannedAt = new Date().toISOString(); // スキャン時刻

    if (!userEmail) {
        const errorMsg = "エラー: 参加者情報（メールアドレス）がURLパラメータから取得できませんでした。";
        console.error(errorMsg);
        alert(errorMsg + "\n再度、スタンプラリー画面を開き直してください。");
        updateResultsDisplay('エラー: メールアドレス未設定', 'error');
        // スキャナーを停止する場合
        if (window.html5QrcodeScannerInstance) {
             window.html5QrcodeScannerInstance.clear().catch(err => console.error("スキャナーの停止に失敗:", err));
        }
        return;
    }

    // Glideの親ページにデータを送信するオブジェクト
    const messageToGlide = {
        type: 'qrScanResult', // メッセージの種類を識別するため (Glide側でこのタイプをリッスン)
        payload: {
            email: userEmail,
            qrData: decodedText,
            timestamp: scannedAt
        }
    };

    // window.parent が存在するか確認 (iframe内から親ウィンドウにアクセス)
    if (window.parent && window.parent !== window) {
        // ★★★ Glideアプリのオリジンを指定してください ★★★
        // セキュリティ上、 '*' は非推奨です。Glideアプリの公開URLのオリジンを指定してください。
        // 例: const glideAppOrigin = 'https://xxxxxx.glideapp.io';
        const glideAppOrigin = '*'; // 動作確認用。本番ではGlideアプリのオリジンを指定してください。

        try {
            window.parent.postMessage(messageToGlide, glideAppOrigin);
            console.log('Glide親ページへのメッセージ送信成功:', messageToGlide);
            updateResultsDisplay(`「${decodedText}」をアプリに送信しました。`, 'success');
            alert(`スタンプ情報「${decodedText}」をアプリに送信しました。\nアプリが自動で記録します。`);

            // オプション: スキャン成功後にスキャナーを停止する
            if (window.html5QrcodeScannerInstance) {
                window.html5QrcodeScannerInstance.clear().catch(err => {
                    console.error("スキャナーの停止に失敗:", err);
                });
                // 少し遅延させてメッセージを表示
                setTimeout(() => {
                     updateResultsDisplay('スキャンを停止しました。再度スキャンするにはページを更新してください。', 'info');
                }, 500);
            }

        } catch (postMessageError) {
            console.error('Glide親ページへのメッセージ送信に失敗:', postMessageError);
            updateResultsDisplay('エラー: アプリとの連携に失敗しました (送信エラー)。', 'error');
            alert('エラー: アプリケーションとの連携中に問題が発生しました。システム管理者に連絡してください。');
        }
    } else {
        console.warn('Glide親ページが見つかりません。Web Embedコンポーネント内で実行されていますか？');
        updateResultsDisplay('エラー: アプリケーションの連携先が見つかりません。', 'error');
        alert('エラー: このページはGlideアプリ内で使用されることを想定しています。');
    }
}

/**
 * QRコードのスキャンが失敗したときに呼び出されるコールバック関数
 * @param {string} error エラーメッセージ (通常は無視してOK)
 */
function onScanFailure(error) {
    // 頻繁にログが出るため、デバッグ時以外はコメントアウト推奨
    // console.warn(`コードスキャンエラー = ${error}`);
}

// HTMLドキュメントの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', (event) => {
    const userEmailDisplay = document.getElementById('user-email-display');
    const resultsDisplay = document.getElementById('qr-reader-results');
    const userEmail = getQueryParam('email');
    console.log("ページ読み込み完了。ユーザー:", userEmail);

    if (userEmailDisplay) {
        if (userEmail) {
            userEmailDisplay.innerText = `参加者: ${userEmail}`;
            userEmailDisplay.style.color = '#3f51b5'; // Restore default color
        } else {
            userEmailDisplay.innerText = '参加者情報なし (URLに ?email=... が必要)';
            userEmailDisplay.style.color = 'red';
            // ページ読み込み時にメールアドレスがない場合はアラートを出す
            alert("参加者のメールアドレスがURLパラメータに含まれていません。\nスタンプラリーのリンクを確認してください。\n(例: .../index.html?email=your_email@example.com)");
            updateResultsDisplay('エラー: メールアドレスが設定されていません。QRコードをスキャンできません。', 'error');
            // メールアドレスがない場合はスキャナーを初期化しない
            return;
        }
    } else {
        console.warn("ID 'user-email-display' の要素が見つかりません。");
    }

    // スキャナーインスタンスをグローバルスコープに格納して、onScanSuccessからアクセスできるようにする
    // try-catchで囲み、エラー発生時にもユーザーにフィードバックを提供
    try {
        window.html5QrcodeScannerInstance = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10, // スキャン頻度
                qrbox: (viewportWidth, viewportHeight) => {
                    // スキャン領域のサイズをビューポートに基づいて調整
                    const edgePercentage = 0.7; // スキャンボックスの端の割合
                    const minEdgeSize = Math.min(viewportWidth * edgePercentage, viewportHeight * edgePercentage, 300); // 最大300px
                    return { width: Math.max(minEdgeSize, 200), height: Math.max(minEdgeSize, 200) }; // 最低200px
                },
                rememberLastUsedCamera: true, // 最後に使用したカメラを記憶
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] // カメラのみを使用
            },
            /* verbose= */ false // 詳細ログを無効化
        );

        window.html5QrcodeScannerInstance.render(onScanSuccess, onScanFailure);
        updateResultsDisplay('QRコードをスキャンしてください', 'info'); // 初期メッセージ

    } catch (scannerError) {
        console.error("Html5QrcodeScanner の初期化に失敗:", scannerError);
        updateResultsDisplay('エラー: QRスキャナーの起動に失敗しました。カメラの許可を確認してください。', 'error');
        alert('QRスキャナーの起動に失敗しました。\nカメラへのアクセスが許可されているか確認してください。');
    }
});
