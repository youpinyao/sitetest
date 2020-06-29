module.exports = {
  score: () => { },
  response: (data = []) => {
    return {
      status: data.length ? 200 : 500,
      monitorTimes: data.map(item => {
        return {
          // 白屏时间
          firstPaint: item.firstPaint,
          // 首个资源时间
          responseTime: item.responseStart - item.timeOrigin,
          // 有效渲染时间
          firstMeaningfulPaint: item.firstMeaningfulPaint,
          // 页面加载时间
          loadTime: item.domComplete - item.timeOrigin,
          // 页面总大小
          transferSize: item.transferSize,
          // DOM个数
          domCount: item.domCount,
          // 重定向时间
          redirectTime: item.redirectTime,
          // 重定向个数
          redirectCount: item.redirectCount,
          // 分数
          score: item.score,
        }
      })
    }
  }
}