/**
 * 底部状态指示器
 * 检测 cm-content 是否存在，显示绿/黄/红圆点
 */

let cmStatusTimer = null;
let cmStatusDetected = false;

function updateCmStatusIndicator() {
  const dot = document.getElementById('sh-sync-dot');
  const text = document.getElementById('sh-sync-text');
  if (!dot || !text) return;

  const cmExists = !!findCmContent();
  dot.className = 'sh-sync-dot';

  if (cmExists) {
    cmStatusDetected = true;
    dot.classList.add('sh-sync-synced');
    text.textContent = '自动同步';
    text.style.color = '#15803d';
    // 检测到后停止轮询
    stopCmStatusPolling();
  } else if (!cmStatusDetected) {
    // 尚未检测到，显示黄色检测中
    dot.classList.add('sh-sync-detecting');
    text.textContent = '';
    text.style.color = '';
  } else {
    // 之前检测到但现在丢失，显示红色
    dot.classList.add('sh-sync-failed');
    text.textContent = '需要手动复制粘贴';
    text.style.color = '#dc2626';
  }
}

function startCmStatusPolling() {
  if (cmStatusTimer) clearInterval(cmStatusTimer);
  cmStatusDetected = false;
  updateCmStatusIndicator();
  // 每200ms检测一次，持续2s
  cmStatusTimer = setInterval(updateCmStatusIndicator, 200);
  // 2s后如果还没检测到，标记为失败并降低检测频率
  setTimeout(() => {
    if (!cmStatusDetected) {
      stopCmStatusPolling();
      // 最终判定：显示红色
      const dot = document.getElementById('sh-sync-dot');
      const text = document.getElementById('sh-sync-text');
      if (dot && text) {
        dot.className = 'sh-sync-dot sh-sync-failed';
        text.textContent = '需要手动复制粘贴';
        text.style.color = '#dc2626';
      }
      // 降低频率继续监听，以便后续出现时能自动变绿
      cmStatusTimer = setInterval(updateCmStatusIndicator, 2000);
    }
  }, 2000);
}

function stopCmStatusPolling() {
  if (cmStatusTimer) { clearInterval(cmStatusTimer); cmStatusTimer = null; }
}
