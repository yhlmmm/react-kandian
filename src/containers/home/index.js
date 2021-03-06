import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import BScroll from 'better-scroll';
import { fromJS } from 'immutable';
import { Tabs, List, Flex, Carousel } from 'antd-mobile';
import axios from '../../axios/';
import Header from '../../compontents/header/header';
import * as clicknumActions from '../../actions/clicknum';
import './index.css';
const Item = List.Item;
const Brief = Item.Brief;

var that;
class Home extends React.PureComponent {
	constructor() {
		super();
		that = this;
		this.listWrapperRef = React.createRef();
		this.state = {
			data: fromJS({
				tagList: [{}],
				bannerList: [],
				newsList: [],
				cid: 0,
				scroller: '',
				pageIndex: 0
			})
		};
		//获取头部tags信息
		axios({
			method: 'get',
			url: '/api/cate/cate_list'
		})
			.then(function(response) {
				if (response.data.code === 0) {
					//循环绑定data active
					for (var item of response.data.data) {
						item.active = false;
					}
					that.setState(({ data }) => ({
						data: data
							.update('tagList', () => fromJS(response.data.data))
							.update('cid', () => response.data.data[0].id)
					}));
				}
			})
			.then(function() {
				//获取新闻列表信息
				var cid = that.state.data.getIn(['tagList', 0, 'id']);
				axios
					.get('/api/news/news_list?cid=' + cid + '&offset=0')
					.then(function(response) {
						if (response.data.code === 0) {
							if (response.data.data.dataList.length > 0) {
								that.setState(({ data }) => ({
									data: data
										.update('cid', () => cid)
										.update('pageIndex', () => 1)
										.update('newsList', () =>
											fromJS(response.data.data.dataList)
										)
								}));
							} else {
								that.setState(({ data }) => ({
									data: data.update('cid', () => cid)
								}));
							}
						}
					});
			});
		//获取banner广告信息
		axios.get('/api/face/face_list').then(function(response) {
			if (response.data.code === 0) {
				that.setState(({ data }) => ({
					data: data.update('bannerList', () =>
						fromJS(response.data.data.filter(item => item.is_show === '1'))
					)
				}));
			}
		});
	}

	componentDidUpdate() {
		var bScroll = that.state.data.get('scroller');
		if (bScroll) {
			bScroll.refresh();
		} else {
			that.setState(
				() => ({
					data: that.state.data.update(
						'scroller',
						() =>
							new BScroll(that.listWrapperRef.current, {
								click: true,
								scrollbar: {
									fade: true,
									interactive: false // 1.8.0 新增
								}
							})
					)
				}),
				function() {
					bScroll = bScroll || that.state.data.get('scroller');
					bScroll.on('scrollEnd', function() {
						if (bScroll.maxScrollY === bScroll.y) {
							//获取选中的标签id
							let tagId = that.state.data.get('cid');
							let offset = that.state.data.get('pageIndex') * 10;
							axios
								.get('/api/news/news_list?cid=' + tagId + '&offset=' + offset)
								.then(function(response) {
									if (response.data.code === 0) {
										if (response.data.data.dataList.length > 0) {
											that.setState(({ data }) => ({
												data: data
													.update(
														'pageIndex',
														() => that.state.data.pageIndex + 1
													)
													.update('newsList', () =>
														fromJS(
															that.state.data
																.get('newsList')
																.toJS()
																.concat(response.data.data.dataList)
														)
													)
											}));
										}
									}
								});
						}
					});
				}
			);
		}
	}

	changeTab(modal) {
		//获取新闻列表信息
		var cid = modal.id;
		axios
			.get('/api/news/news_list?cid=' + cid + '&offset=0')
			.then(function(response) {
				if (response.data.code === 0) {
					that.setState(({ data }) => ({
						data: data.update('cid', () => cid)
					}));
					if (response.data.data.dataList.length > 0) {
						that.setState(({ data }) => ({
							data: data
								.update('pageIndex', () => 0)
								.update('newsList', () => fromJS(response.data.data.dataList))
						}));
					}
				}
			});
	}

	gotoDetail(item) {
		//增加今日阅读数
		this.props.clicknumActions.changeClickNumberAsync();
		this.props.history.push('/detail/' + item.id);
	}

	render() {
		var tabpanes = this.state.data
			.get('tagList')
			.toJS()
			.map(item => ({ title: item.name, id: item.id }));
		var bannerLists = this.state.data
			.get('bannerList')
			.toJS()
			.map((item, index) => (
				<a href={item.url} key={index}>
					<img src={item.pic} alt="icon" />
				</a>
			));
		var newsLists = this.state.data
			.get('newsList')
			.toJS()
			.map((item, index) => (
				<Item
					onClick={this.gotoDetail.bind(this, item)}
					key={index}
					align="top"
					thumb={
						item.litpic.includes('http')
							? item.litpic
							: 'http://211.149.160.35' + item.litpic
					}
					multipleLine
				>
					{item.title}
					<Brief className="news-brief">
						<Flex justify="between">
							<Flex.Item>{item.news_from}</Flex.Item>
							<Flex.Item>{item.price}K币</Flex.Item>
							<Flex.Item>阅读：{item.click}</Flex.Item>
						</Flex>
					</Brief>
				</Item>
			));
		return (
			<div className="home">
				<Header title="看点" />
				<Tabs tabs={tabpanes} onChange={this.changeTab.bind(this)} />

				<div ref={this.listWrapperRef} className="newsListWrapper">
					<div className="scroller">
						{bannerLists.length > 0 ? (
							<Carousel
								className="my-carousel"
								autoplay={true}
								infinite
								selectedIndex={1}
								swipeSpeed={35}
							>
								{bannerLists}
							</Carousel>
						) : (
							''
						)}

						<List className="my-list">{newsLists}</List>
					</div>
				</div>
			</div>
		);
	}
}

Home.propTypes = {
	history: PropTypes.object,
	clicknumActions: PropTypes.object
};

function mapStateToProps(state) {
	return { number: state.clicknum.number, loading: state.clicknum.loading };
}
function mapDispatchToProps(dispatch) {
	return {
		//通过bindActionCreators把dispath注入进action中，调用action，则会自动触发dispath，修改store
		clicknumActions: bindActionCreators(clicknumActions, dispatch)
	};
}

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Home);
