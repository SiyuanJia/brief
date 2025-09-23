// ==================== 下载逻辑（拆分） ====================
function downloadImage() {
  const node = document.getElementById('report-container');

  // 检测设备类型
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  console.log('设备检测:', { isMobile, userAgent: navigator.userAgent });

  // 获取实际尺寸
  const computedStyle = window.getComputedStyle(node);
  const actualWidth = node.scrollWidth;
  const actualHeight = node.scrollHeight;
  // 移动端限制导出高度，避免超大画布导致失败（如部分内核的 4096/8192 限制）
  const maxExportHeight = 2200;
  const scale = isMobile ? Math.min(1, maxExportHeight / Math.max(1, actualHeight)) : 1;

  console.log('容器尺寸:', {
    scrollWidth: actualWidth,
    scrollHeight: actualHeight,
    clientWidth: node.clientWidth,
    clientHeight: node.clientHeight,
    offsetWidth: node.offsetWidth,
    offsetHeight: node.offsetHeight,
    isMobile: isMobile
  });

  // 移动端使用更保守的设置
  const options = isMobile ? {
    quality: 0.7,
    width: Math.round(actualWidth * scale),
    height: Math.round(actualHeight * scale),
    bgcolor: '#f5f2e8',
    pixelRatio: 1,
    cacheBust: true,
    imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    style: {
      margin: '0',
      boxSizing: 'border-box',
      transform: `scale(${scale})`,
      transformOrigin: 'top left'
    },
    filter: function(node) {
      try {
        // 跳过含有跨域背景图的元素
        const cs = node.nodeType === 1 ? window.getComputedStyle(node) : null;
        if (cs && cs.backgroundImage && /url\(/.test(cs.backgroundImage) && /^url\((?!['"]?data:)/.test(cs.backgroundImage)) return false;
        // 跳过跨域 <img>
        if (node.tagName === 'IMG') {
          const src = node.getAttribute('src') || '';
          if (src && !/^data:|^blob:|^\//.test(src) && !src.includes(window.location.host)) return false;
        }
      } catch(e) {}
      return true;
    }
  } : {
    quality: 1.0,
    width: actualWidth,
    height: actualHeight,
    style: {
      margin: '0',
      padding: computedStyle.padding,
      boxSizing: 'border-box'
    },
    bgcolor: '#f5f2e8'
  };

  // 添加超时处理
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('下载超时')), isMobile ? 12000 : 30000);
  });

  Promise.race([
    domtoimage.toPng(node, options),
    timeoutPromise
  ])
    .then(function (dataUrl) {
      console.log('图片生成成功，数据长度:', dataUrl.length);

      if (isMobile) {
        // 移动端：先尝试使用 a[download] 直接保存，失败则提示用户改用桌面或截屏
        try {
          const link = document.createElement('a');
          link.download = '财经时事资讯简报-' + new Date().toISOString().slice(0, 10) + '.png';
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.warn('移动端下载失败:', e);
          alert('由于图片较大，请使用桌面浏览器下载，或者用截屏保存页面');
        }
      } else {
        // 桌面端使用标准下载方式
        const link = document.createElement('a');
        link.download = '财经时事资讯简报-' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = dataUrl;
        link.click();
      }
    })
    .catch(async function (error) {
      console.error('下载图片时出错:', error);

      // 简化策略：移动端失败直接提示使用桌面或截屏；PC 提示重试（不再进行库级兜底）
      if (isMobile) {
        alert('由于图片较大，请使用桌面浏览器下载，或者用截屏保存页面');
        return;
      } else {
        alert('下载图片时出错，请重试');
        return;
      }
    });
}

// 暴露到全局（可选）
if (typeof window !== 'undefined') {
  window.downloadImage = downloadImage;
}

