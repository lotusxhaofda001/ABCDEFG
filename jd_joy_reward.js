/*
cron "58 7,15,23 * * *" jd_joy_reward_Mod.js
 */
//by 标哥丶 20220118
const $ = new Env('宠汪汪积分兑换有就换修复版');
const CryptoJS = require('crypto-js');
const zooFaker = require('./utils/JDJRValidator_Pure');
let allMessage = '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
const notify = $.isNode() ? require('./sendNotify') : '';
let jdNotify = false; //是否开启静默运行，默认false关闭(即:奖品兑换成功后会发出通知提示)
let Today = new Date();
let strDisable20 = "false";
let algo = {
	'd67c8': {},
	'9218e': {}
};

//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';

if ($.isNode()) {
	Object.keys(jdCookieNode).forEach((item) => {
		cookiesArr.push(jdCookieNode[item])
	})
	if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false')
		console.log = () => { };
} else {
	cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
Date.prototype.Format = function (fmt) {
	var o = {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours(), //小时
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"S": this.getMilliseconds() //毫秒
	};
	if (/(y+)/.test(fmt))
		fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
		if (new RegExp("(" + k + ")").test(fmt))
			fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

!(async () => {
	if (!cookiesArr[0]) {
		$.msg('【京东账号一】宠汪汪积分兑换奖品失败', '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {
			"open-url": "https://bean.m.jd.com/bean/signIndex.action"
		});
	}
	await getAlgo('d67c8');
	await getAlgo('9218e');
	for (let i = 0; i < cookiesArr.length; i++) {
		if (cookiesArr[i]) {
			cookie = cookiesArr[i];
			$.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
			$.index = i + 1;
			$.isLogin = true;
			$.nickName = '' || $.UserName;

			await TotalBean();
			console.log(`\n*****开始【京东账号${$.index}】${$.nickName || $.UserName}****\n`);
			if (!$.isLogin) {
				$.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {
					"open-url": "https://bean.m.jd.com/bean/signIndex.action"
				});

				if ($.isNode()) {
					await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
				}
				continue
			}

			if ($.isNode() && process.env.JOY_GET20WHEN16) {
				strDisable20 = process.env.JOY_GET20WHEN16;
				if (strDisable20 != "false") {
					console.log("设置16点时段才抢20京豆....");
				}
			}

			$.validate = '';
			$.validate = await zooFaker.injectToRequest();
			console.log(`脚本开始请求时间 ${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")}`);
			await joyReward();
		}
	}
	if ($.isNode() && allMessage && $.ctrTemp) {
		await notify.sendNotify(`${$.name}`, `${allMessage}`)
	}
})()
	.catch((e) => {
		$.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
	})
	.finally(() => {
		$.done();
	})

async function joyReward() {
	try {
		let starttime = process.env.JOY_STARTTIME ? process.env.JOY_STARTTIME : 60;
		let nowtime = new Date().getSeconds();
		let sleeptime = 0;
		let rewardNum = '',
			saleInfoId = '',
			giftValue = '',
			extInfo = '',
			salePrice = 0;
		var llError = false;
		let giftSaleInfos = 'beanConfigs0';
		let time = new Date().getHours();
		if (time >= 0 && time < 8) {
			giftSaleInfos = 'beanConfigs0';
			if (time == 7 && new Date().getMinutes() > 50) {
				giftSaleInfos = 'beanConfigs8';
			}
		}
		if (time >= 8 && time < 16) {
			giftSaleInfos = 'beanConfigs8';
			if (time == 15 && new Date().getMinutes() > 50) {
				giftSaleInfos = 'beanConfigs16';
			}
		}
		if (time >= 16 && time < 24) {
			giftSaleInfos = 'beanConfigs16';
			if (time == 23 && new Date().getMinutes() > 50) {
				giftSaleInfos = 'beanConfigs0';
			}
		}

		if (new Date().getHours() >= 15 && new Date().getHours() < 23 && strDisable20 != "false") {
			console.log("现在是15点后时段，执行先抢500京豆再抢20京豆...");
			strDisable20 = "false";
		}

		console.log(`debug场次:${giftSaleInfos}\n`)

		for (let intTimes = 0; intTimes <= 0; intTimes++) {
			llError = false;
			await getExchangeRewards();
			if ($.getExchangeRewardsRes && $.getExchangeRewardsRes.success) {
				const data = $.getExchangeRewardsRes.data;
				try {
					for (let item of data[giftSaleInfos]) {
						if (item.giftType === 'jd_bean') {
							saleInfoId = item.id;
						}
					}
				} catch (e) {
					llError = true;
					console.log('东哥搞事情，不给京豆ID，等待5秒后重新获取...');
					await $.wait(5000);
				}
				if (llError) {
					continue;
				} else {
					console.log('成功获取场次信息...');
					break;
				}

			}
		}
		if (llError) {
			console.log('东哥说现在不给你兑换，死了这条心吧...');
			return;
		}

		if (new Date().getMinutes() == 58) {
			sleeptime = (60 - nowtime) * 1000;
			console.log(`请等待时间到达59分` + `等待时间 ${sleeptime / 1000}`);
			await $.wait(sleeptime);
		}

		if (new Date().getMinutes() == 59) {
			console.log(`脚本现在时间 ${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")}`);
			nowtime = new Date().getSeconds();
			if (nowtime < 59) {
				nowtime = new Date().getSeconds() + 1;
				sleeptime = (starttime - nowtime) * 1000;
				console.log(`等待时间 ${sleeptime / 1000}`);
				await $.wait(sleeptime);
			}
		}
		var llChange500 = false;
		var llSuccess = false;
		llError = false;
		for (let j = 0; j <= 14; j++) {
			if (llSuccess) {
				console.log(`兑换成功，跳出循环...\n`);
				break;
			}
			if (llError) {
				console.log(`兑换失败，跳出循环...\n`);
				break;
			}

			console.log(`\n正在尝试第` + (j + 1) + `次执行:${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")} \n`);
			const data = $.getExchangeRewardsRes.data;
			if(!data) {
				console.log($.getExchangeRewardsRes)
				console.log("黑号了")
			}
			if (llChange500) {
				for (let item of data[giftSaleInfos]) {
					if (item.giftType === 'jd_bean') {
						saleInfoId = item.id;
						salePrice = item.salePrice;
						giftValue = item.giftValue;
						rewardNum = giftValue;
						if (salePrice && rewardNum == 500) {
							if (!saleInfoId)
								continue;
							console.log(`开始兑换${rewardNum}京豆,时间 ${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")}`);
							await exchange(saleInfoId, 'pet');
							console.log(`结束兑换API后时间 ${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")}`);
							if ($.exchangeRes && $.exchangeRes.success) {
								if ($.exchangeRes.errorCode === 'buy_success') {
									console.log(`兑换${giftValue}成功,【消耗积分】${salePrice}个`)
									llSuccess = true;
									if ($.isNode() && process.env.JD_JOY_REWARD_NOTIFY) {
										$.ctrTemp = `${process.env.JD_JOY_REWARD_NOTIFY}` === 'false';
									} else if ($.getdata('jdJoyRewardNotify')) {
										$.ctrTemp = $.getdata('jdJoyRewardNotify') === 'false';
									} else {
										$.ctrTemp = `${jdNotify}` === 'false';
									}
									if ($.ctrTemp) {
										$.msg($.name, ``, `【京东账号${$.index}】${$.nickName}\n【${giftValue}京豆】兑换成功🎉\n【积分详情】消耗积分 ${salePrice}`);
										if ($.isNode()) {
											allMessage += `【京东账号${$.index}】 ${$.nickName}\n【${giftValue}京豆】兑换成功🎉\n【积分详情】消耗积分 ${salePrice}${$.index !== cookiesArr.length ? '\n\n' : ''}`
										}
										break;
									}
								} else if ($.exchangeRes && $.exchangeRes.errorCode === 'buy_limit') {
									console.log(`兑换${rewardNum}京豆失败，原因：兑换京豆已达上限，请把机会留给更多的小伙伴~`)
									llError = true;
									break;
								} else if ($.exchangeRes && $.exchangeRes.errorCode === 'stock_empty') {
									console.log(`兑换${rewardNum}京豆失败，原因：当前京豆库存为空`)
								} else if ($.exchangeRes && $.exchangeRes.errorCode === 'insufficient') {
									console.log(`兑换${rewardNum}京豆失败，原因：当前账号积分不足兑换${giftValue}京豆所需的${salePrice}积分`)
									if (strDisable20 != "false") {
										console.log(`关闭兑换500京豆，开启20京豆兑换...`)
										strDisable20 = "false";
									} else {
										console.log(`关闭兑换500京豆...`)
									}
									llChange500 = false;

								} else {
									console.log(`兑奖失败:${JSON.stringify($.exchangeRes)}`)
								}
							} else {
								console.log(`兑换京豆异常:${JSON.stringify($.exchangeRes)}`)
							}

						}
					}
				}
			}
			if (strDisable20 == "false") {
				for (let item of data[giftSaleInfos]) {
					if (item.giftType === 'jd_bean') {
						saleInfoId = item.id;
						salePrice = item.salePrice;
						giftValue = item.giftValue;
						rewardNum = giftValue;
						if (salePrice && rewardNum == 20) {

							if (!saleInfoId)
								continue;
							console.log(`开始兑换${rewardNum}京豆,时间 ${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")}`);
							await exchange(saleInfoId, 'pet');
							console.log(`结束兑换API后时间 ${(new Date()).Format("yyyy-MM-dd hh:mm:ss | S")}`);
							if ($.exchangeRes && $.exchangeRes.success) {
								if ($.exchangeRes.errorCode === 'buy_success') {
									console.log(`兑换${giftValue}成功,【消耗积分】${salePrice}个`)
									llSuccess = true;
									if ($.isNode() && process.env.JD_JOY_REWARD_NOTIFY) {
										$.ctrTemp = `${process.env.JD_JOY_REWARD_NOTIFY}` === 'false';
									} else if ($.getdata('jdJoyRewardNotify')) {
										$.ctrTemp = $.getdata('jdJoyRewardNotify') === 'false';
									} else {
										$.ctrTemp = `${jdNotify}` === 'false';
									}
									if ($.ctrTemp) {
										$.msg($.name, ``, `【京东账号${$.index}】${$.nickName}\n【${giftValue}京豆】兑换成功🎉\n【积分详情】消耗积分 ${salePrice}`);
										if ($.isNode()) {
											allMessage += `【京东账号${$.index}】 ${$.nickName}\n【${giftValue}京豆】兑换成功🎉\n【积分详情】消耗积分 ${salePrice}${$.index !== cookiesArr.length ? '\n\n' : ''}`
										}
										break;
									}
								} else if ($.exchangeRes && $.exchangeRes.errorCode === 'buy_limit') {
									console.log(`兑换${rewardNum}京豆失败，原因：兑换京豆已达上限，请把机会留给更多的小伙伴~`)
									llError = true;
									break;
								} else if ($.exchangeRes && $.exchangeRes.errorCode === 'stock_empty') {
									console.log(`兑换${rewardNum}京豆失败，原因：当前京豆库存为空`)
								} else if ($.exchangeRes && $.exchangeRes.errorCode === 'insufficient') {
									console.log(`兑换${rewardNum}京豆失败，原因：当前账号积分不足兑换${giftValue}京豆所需的${salePrice}积分`)
									llError = true;
									break;
								} else {
									console.log(`兑奖失败:${JSON.stringify($.exchangeRes)}`)
								}
							} else {
								console.log(`兑换京豆异常:${JSON.stringify($.exchangeRes)}`)
							}

						}
					}
				}
			}

			await $.wait(300);
		}
	} catch (e) {
		$.logErr(e)
	}
}
async function getExchangeRewards() {
	let params = {
		code: 'd67c8',
		functionId: 'giftGetBeanConfigs',
		body: {reqSource:"h5"}
	}
	h5ts = await getH5st(params);
	return new Promise(resolve => {
		let tiem = h5ts.split(';').pop();
		const option = {
			url: `https://api.m.jd.com/api?client=android&clientVersion=10.3.2&appid=jdchoujiang_h5&t=${tiem}&functionId=giftGetBeanConfigs&body={%22reqSource%22:%22h5%22}&h5st=${encodeURIComponent(h5ts)}`,
			headers: {
				"Host": "api.m.jd.com",
				"Accept": "*/*",
				"Origin": "https://h5.m.jd.com",
				"Accept-Language": "zh-CN,zh-Hans;q=0.9",
				"User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
				"Referer": "https://h5.m.jd.com/",
				"Accept-Encoding": "gzip, deflate, br",
				"Cookie": cookie,
			}
		}
		$.post(option, (err, resp, data) => {
			try {
				if (err) {
					console.log(JSON.stringify(err))
					console.log(`${$.name} getExchangeRewards API请求失败，请检查网路重试`)
				} else {
					$.getExchangeRewardsRes = {};
					if (safeGet(data)) {
						$.getExchangeRewardsRes = JSON.parse(data);
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			}
			finally {
				resolve();
			}
		})
	})
}
async function exchange(saleInfoId, orderSource) {
	let body = {
		buyParam:
			{
				orderSource: orderSource,
				saleInfoId: saleInfoId
			},
		deviceInfo: {},
		reqSource: "h5"
	}
	let params = {
		code: '9218e',
		functionId: 'giftNewExchange',
		body
	}
	h5ts = await getH5st(params);
	let tiem = h5ts.split(';').pop();


	return new Promise(resolve => {
		const option = {
			url: `https://api.m.jd.com/api?client=android&clientVersion=10.3.2&appid=jdchoujiang_h5&t=${tiem}&functionId=giftNewExchange&body=${encodeURIComponent(JSON.stringify(body))}&h5st=${encodeURIComponent(h5ts)}`,
			headers: {
				"Host": "api.m.jd.com",
				"Content-Type": "application/json",
				"Accept": "*/*",
				"Accept-Language": "zh-CN,zh-Hans;q=0.9",
				"Accept-Encoding": "gzip, deflate, br",
				"Origin": "https://h5.m.jd.com",
				"User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
				"Referer": "https://h5.m.jd.com/",
				"Cookie": cookie,
			}
		}

		$.post(option, (err, resp, data) => {
			try {
				if (err) {
					console.log(JSON.stringify(err))
					console.log(`${$.name} exchange API请求失败，请检查网路重试`)
				} else {
					//console.log(`兑换结果:${data}`)
					$.exchangeRes = {};
					if (safeGet(data)) {
						$.exchangeRes = JSON.parse(data)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			}
			finally {
				resolve()
			}
		})
	})
}
function TotalBean() {
	return new Promise(async resolve => {
		const options = {
			"url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
			"headers": {
				"Accept": "application/json,text/plain, */*",
				"Content-Type": "application/x-www-form-urlencoded",
				"Accept-Encoding": "gzip, deflate, br",
				"Accept-Language": "zh-cn",
				"Connection": "keep-alive",
				"Cookie": cookie,
				"Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
				"User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
			}
		}
		$.post(options, (err, resp, data) => {
			try {
				if (err) {
					console.log(`${JSON.stringify(err)}`)
					console.log(`${$.name} API请求失败，请检查网路重试`)
				} else {
					if (data) {
						data = JSON.parse(data);
						if (data['retcode'] === 13) {
							$.isLogin = false; //cookie过期
							return
						}
						if (data['retcode'] === 0) {
							$.nickName = (data['base'] && data['base'].nickname) || $.UserName;
						} else {
							$.nickName = $.UserName
						}
					} else {
						console.log(`京东服务器返回空数据`)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			}
			finally {
				resolve();
			}
		})
	})
}
function jsonParse(str) {
	if (typeof str == "string") {
		try {
			return JSON.parse(str);
		} catch (e) {
			console.log(e);
			$.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
			return [];
		}
	}
}
function safeGet(data) {
	try {
		if (typeof JSON.parse(data) == "object") {
			return true;
		}
	} catch (e) {
		console.log(e);
		console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
		return false;
	}
}
async function getAlgo(id) {
	let fp = await generateFp();
	algo[id].fingerprint = fp;
	const options = {
		"url": `https://cactus.jd.com/request_algo?g_ty=ajax`,
		"headers": {
			'Authority': 'cactus.jd.com',
			'Pragma': 'no-cache',
			'Cache-Control': 'no-cache',
			'Accept': 'application/json',
			'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
			'Content-Type': 'application/json',
			'Origin': 'https://h5.m.jd.com',
			'Sec-Fetch-Site': 'cross-site',
			'Sec-Fetch-Mode': 'cors',
			'Sec-Fetch-Dest': 'empty',
			'Referer': 'https://h5.m.jd.com/',
			'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8,en;q=0.7'
		},
		'body': JSON.stringify({
			"version": "3.0",
			"fp": fp,
			"appId": id.toString(),
			"timestamp": Date.now(),
			"platform": "web",
			"expandParams": ""
		})
	}
	return new Promise(async resolve => {
		$.post(options, (err, resp, data) => {
			try {
				if (err) {
					console.log(`${JSON.stringify(err)}`)
					console.log(`request_algo 签名参数API请求失败，请检查网路重试`)
				} else {
					if (data) {
						data = JSON.parse(data);
						if (data['status'] === 200) {
							algo[id].token = data.data.result.tk;
							let enCryptMethodJDString = data.data.result.algo;
							if (enCryptMethodJDString) algo[id].enCryptMethodJD = new Function(`return ${enCryptMethodJDString}`)();
							console.log(`获取加密参数成功！`)
						} else {
							console.log(`fp: ${fp}`)
							console.log('request_algo 签名参数API请求失败:')
						}
					} else {
						console.log(`京东服务器返回空数据`)
					}
				}
			} catch (e) {
				$.logErr(e, resp)
			} finally {
				resolve();
			}
		})
	})
}
function generateFp() {
	let e = "0123456789";
	let a = 13;
	let i = '';
	for (; a--;)
		i += e[Math.random() * e.length | 0];
	return (i + Date.now()).slice(0, 16)
}
async function getH5st(params) {
	let date = new Date(),timestamp,key,SHA256;
	timestamp = date.Format("yyyyMMddhhmmssS");
	key = await algo[params.code].enCryptMethodJD(algo[params.code].token, algo[params.code].fingerprint, timestamp, params.code, CryptoJS).toString();
	SHA256 = await getSHA256(key, params, date.getTime());

	return `${timestamp};${algo[params.code].fingerprint};${params.code};${algo[params.code].token};${SHA256};3.0;${date.getTime()}`
}
function getSHA256(key, params, dete) {
	let SHA256 = CryptoJS.SHA256(JSON.stringify(params.body)).toString()
	let stringSign = `appid:jdchoujiang_h5&body:${SHA256}&client:android&clientVersion:10.3.2&functionId:${params.functionId}&t:${dete}`
	let hash = CryptoJS.HmacSHA256(stringSign, key);
	let hashInHex = CryptoJS.enc.Hex.stringify(hash);

	return hashInHex;
}
// prettier-ignore
function Env(t, e) {
	class s {
		constructor(t) {
			this.env = t
		}
		send(t, e = "GET") {
			t = "string" == typeof t ? {
					url: t
				}
				: t;
			let s = this.get;
			return "POST" === e && (s = this.post),
				new Promise((e, i) => {
					s.call(this, t, (t, s, r) => {
						t ? i(t) : e(s)
					})
				})
		}
		get(t) {
			return this.send.call(this.env, t)
		}
		post(t) {
			return this.send.call(this.env, t, "POST")
		}
	}
	return new class {
		constructor(t, e) {
			this.name = t,
				this.http = new s(this),
				this.data = null,
				this.dataFile = "box.dat",
				this.logs = [],
				this.isMute = !1,
				this.isNeedRewrite = !1,
				this.logSeparator = "\n",
				this.startTime = (new Date).getTime(),
				Object.assign(this, e),
				this.log("", `🔔${this.name}, 开始!`)
		}
		isNode() {
			return "undefined" != typeof module && !!module.exports
		}
		isQuanX() {
			return "undefined" != typeof $task
		}
		isSurge() {
			return "undefined" != typeof $httpClient && "undefined" == typeof $loon
		}
		isLoon() {
			return "undefined" != typeof $loon
		}
		toObj(t, e = null) {
			try {
				return JSON.parse(t)
			} catch {
				return e
			}
		}
		toStr(t, e = null) {
			try {
				return JSON.stringify(t)
			} catch {
				return e
			}
		}
		getjson(t, e) {
			let s = e;
			const i = this.getdata(t);
			if (i)
				try {
					s = JSON.parse(this.getdata(t))
				} catch { }
			return s
		}
		setjson(t, e) {
			try {
				return this.setdata(JSON.stringify(t), e)
			} catch {
				return !1
			}
		}
		getScript(t) {
			return new Promise(e => {
				this.get({
					url: t
				}, (t, s, i) => e(i))
			})
		}
		runScript(t, e) {
			return new Promise(s => {
				let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
				i = i ? i.replace(/\n/g, "").trim() : i;
				let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
				r = r ? 1 * r : 20,
					r = e && e.timeout ? e.timeout : r;
				const [o, h] = i.split("@"),
					n = {
						url: `http://${h}/v1/scripting/evaluate`,
						body: {
							script_text: t,
							mock_type: "cron",
							timeout: r
						},
						headers: {
							"X-Key": o,
							Accept: "*/*"
						}
					};
				this.post(n, (t, e, i) => s(i))
			}).catch(t => this.logErr(t))
		}
		loaddata() {
			if (!this.isNode())
				return {}; {
				this.fs = this.fs ? this.fs : require("fs"),
					this.path = this.path ? this.path : require("path");
				const t = this.path.resolve(this.dataFile),
					e = this.path.resolve(process.cwd(), this.dataFile),
					s = this.fs.existsSync(t),
					i = !s && this.fs.existsSync(e);
				if (!s && !i)
					return {}; {
					const i = s ? t : e;
					try {
						return JSON.parse(this.fs.readFileSync(i))
					} catch (t) {
						return {}
					}
				}
			}
		}
		writedata() {
			if (this.isNode()) {
				this.fs = this.fs ? this.fs : require("fs"),
					this.path = this.path ? this.path : require("path");
				const t = this.path.resolve(this.dataFile),
					e = this.path.resolve(process.cwd(), this.dataFile),
					s = this.fs.existsSync(t),
					i = !s && this.fs.existsSync(e),
					r = JSON.stringify(this.data);
				s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
			}
		}
		lodash_get(t, e, s) {
			const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
			let r = t;
			for (const t of i)
				if (r = Object(r)[t], void 0 === r)
					return s;
			return r
		}
		lodash_set(t, e, s) {
			return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
		}
		getdata(t) {
			let e = this.getval(t);
			if (/^@/.test(t)) {
				const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t),
					r = s ? this.getval(s) : "";
				if (r)
					try {
						const t = JSON.parse(r);
						e = t ? this.lodash_get(t, i, "") : e
					} catch (t) {
						e = ""
					}
			}
			return e
		}
		setdata(t, e) {
			let s = !1;
			if (/^@/.test(e)) {
				const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e),
					o = this.getval(i),
					h = i ? "null" === o ? null : o || "{}" : "{}";
				try {
					const e = JSON.parse(h);
					this.lodash_set(e, r, t),
						s = this.setval(JSON.stringify(e), i)
				} catch (e) {
					const o = {};
					this.lodash_set(o, r, t),
						s = this.setval(JSON.stringify(o), i)
				}
			} else
				s = this.setval(t, e);
			return s
		}
		getval(t) {
			return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
		}
		setval(t, e) {
			return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
		}
		initGotEnv(t) {
			this.got = this.got ? this.got : require("got"),
				this.cktough = this.cktough ? this.cktough : require("tough-cookie"),
				this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar,
			t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
		}
		get(t, e = (() => { })) {
			t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]),
				this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
					"X-Surge-Skip-Scripting": !1
				})), $httpClient.get(t, (t, s, i) => {
					!t && s && (s.body = i, s.statusCode = s.status),
						e(t, s, i)
				})) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
					hints: !1
				})), $task.fetch(t).then(t => {
					const {
						statusCode: s,
						statusCode: i,
						headers: r,
						body: o
					} = t;
					e(null, {
						status: s,
						statusCode: i,
						headers: r,
						body: o
					}, o)
				}, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => {
					try {
						if (t.headers["set-cookie"]) {
							const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
							s && this.ckjar.setCookieSync(s, null),
								e.cookieJar = this.ckjar
						}
					} catch (t) {
						this.logErr(t)
					}
				}).then(t => {
					const {
						statusCode: s,
						statusCode: i,
						headers: r,
						body: o
					} = t;
					e(null, {
						status: s,
						statusCode: i,
						headers: r,
						body: o
					}, o)
				}, t => {
					const {
						message: s,
						response: i
					} = t;
					e(s, i, i && i.body)
				}))
		}
		post(t, e = (() => { })) {
			if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon())
				this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
					"X-Surge-Skip-Scripting": !1
				})), $httpClient.post(t, (t, s, i) => {
					!t && s && (s.body = i, s.statusCode = s.status),
						e(t, s, i)
				});
			else if (this.isQuanX())
				t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
					hints: !1
				})), $task.fetch(t).then(t => {
					const {
						statusCode: s,
						statusCode: i,
						headers: r,
						body: o
					} = t;
					e(null, {
						status: s,
						statusCode: i,
						headers: r,
						body: o
					}, o)
				}, t => e(t));
			else if (this.isNode()) {
				this.initGotEnv(t);
				const {
					url: s,
					...i
				} = t;
				this.got.post(s, i).then(t => {
					const {
						statusCode: s,
						statusCode: i,
						headers: r,
						body: o
					} = t;
					e(null, {
						status: s,
						statusCode: i,
						headers: r,
						body: o
					}, o)
				}, t => {
					const {
						message: s,
						response: i
					} = t;
					e(s, i, i && i.body)
				})
			}
		}
		time(t, e = null) {
			const s = e ? new Date(e) : new Date;
			let i = {
				"M+": s.getMonth() + 1,
				"d+": s.getDate(),
				"H+": s.getHours(),
				"m+": s.getMinutes(),
				"s+": s.getSeconds(),
				"q+": Math.floor((s.getMonth() + 3) / 3),
				S: s.getMilliseconds()
			};
			/(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length)));
			for (let e in i)
				new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)));
			return t
		}
		msg(e = t, s = "", i = "", r) {
			const o = t => {
				if (!t)
					return t;
				if ("string" == typeof t)
					return this.isLoon() ? t : this.isQuanX() ? {
							"open-url": t
						}
						: this.isSurge() ? {
								url: t
							}
							: void 0;
				if ("object" == typeof t) {
					if (this.isLoon()) {
						let e = t.openUrl || t.url || t["open-url"],
							s = t.mediaUrl || t["media-url"];
						return {
							openUrl: e,
							mediaUrl: s
						}
					}
					if (this.isQuanX()) {
						let e = t["open-url"] || t.url || t.openUrl,
							s = t["media-url"] || t.mediaUrl;
						return {
							"open-url": e,
							"media-url": s
						}
					}
					if (this.isSurge()) {
						let e = t.url || t.openUrl || t["open-url"];
						return {
							url: e
						}
					}
				}
			};
			if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) {
				let t = ["", "==============📣系统通知📣=============="];
				t.push(e),
				s && t.push(s),
				i && t.push(i),
					console.log(t.join("\n")),
					this.logs = this.logs.concat(t)
			}
		}
		log(...t) {
			t.length > 0 && (this.logs = [...this.logs, ...t]),
				console.log(t.join(this.logSeparator))
		}
		logErr(t, e) {
			const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
			s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t)
		}
		wait(t) {
			return new Promise(e => setTimeout(e, t))
		}
		done(t = {}) {
			const e = (new Date).getTime(),
				s = (e - this.startTime) / 1e3;
			this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`),
				this.log(),
			(this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
		}
	}
	(t, e)
}
