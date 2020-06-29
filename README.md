# sitetest

## /api/sitetest POST

```node
url             string          检测URL
network         3g|4g|wifi      模拟网络环境
platform        ios|android     模拟平台
callback_url    string          测试完成回调地址
```

## callback_url POST

 返回为数组形式，分别为首次和二次访问数据

```node
{
  statue: 200|500,
  monitorTimes: {
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
}
```
