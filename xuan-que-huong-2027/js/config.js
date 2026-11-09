/*
  NỘI DUNG MẶC ĐỊNH CỦA TRANG WEB
  Toàn bộ nội dung của trang nằm ở file này.
*/

export const CONFIG = {
  eventName: 'Xuân Quê hương 2027',
  eventSub: 'Xuân Quê Hương - Đinh Mùi 2027',
  credit: 'Được thực hiện bởi: Nguyễn Thị Minh Ngọc, Đào Thu Hiền, Nguyễn Trung Thành',
  org: 'Đại sứ quán Việt Nam tại Algeria',
  team: 'Nhóm Thực tập sinh',
  footer: 'Dự án truyền thông chương trình Xuân Quê hương 2027 của nhóm thực tập sinh tại Đại sứ quán Việt Nam tại Algeria.',

  theme: {
    headingFont: 'Fraunces',
    bodyFont: 'EB Garamond (hệ font của chương trình)',
    customFonts: [
      { name: 'Amarego', file: '' },
      { name: 'Assox', file: '' },
      { name: 'Best Swashed', file: '' },
      { name: 'Beautique Display Condensed', file: '' }
    ],
    colors: {
      brand: '#f6e3b4', heroTitle: '#efbf69', heroText: '#f6e3b4',
      pageTitle: '#841b1a', sectionTitle: '#841b1a', body: '#5d4c4c',
      thanksTitle: '#efbf69', thanksText: '#f6e3b4', footer: '#5d4c4c',
      bannerTitle: '#f6e3b4', bannerSub: '#efbf69', couplet: '#f6e3b4', sign: '#f6e3b4'
    }
  },

  hero: { image: '', fit: 'cover', button: 'Bắt đầu xem', art: 'assets/poster/poster-facebook.jpg' },

  moodboard: {
    title: 'Moodboard và visual cue',
    lead: 'Phần này giới thiệu định hướng hình ảnh của chương trình, từ ý tưởng tổng quan, bảng màu, font chữ, các yếu tố đồ họa đến những sản phẩm truyền thông hoàn chỉnh. Sắc đỏ Tết Việt kết hợp với hoa văn Hồi giáo thể hiện sự giao thoa văn hóa Việt Nam và Algeria, mang lại cảm giác ấm áp, trang trọng cho toàn bộ sự kiện.',
    images: [
      { src: 'assets/moodboard/01-y-tuong-tong-quan-v3.jpg', caption: '' }
    ],
    keyVisual: {
      image: 'assets/poster/poster-facebook.jpg',
      caption: 'Thiết kế sử dụng tông nền đỏ chủ đạo, kết hợp họa tiết hoa văn Hồi giáo cùng những hình ảnh trang trí đặc trưng của Tết Việt như nan quạt, hoa mai vàng và hoa đào hồng, gợi lên không khí hân hoan, phấn khởi và hạnh phúc. Hình ảnh chú dê tung tăng dưới những cánh chim én bay lượn vừa tạo cảm giác vui tươi, sinh động, vừa gửi gắm tinh thần lạc quan, hội nhập và khát vọng hướng tới tương lai.'
    },
    palette: [
      { name: 'Đỏ son', hex: '#841B1A', role: 'Nền chủ đạo' },
      { name: 'Đỏ quạt nan', hex: '#A71F02', role: 'Màu họa tiết quạt nan' },
      { name: 'Xanh rêu', hex: '#23402F', role: 'Màu nền sản phẩm truyền thông' },
      { name: 'Hồng đào', hex: '#FE909D', role: 'Màu hoa đào' },
      { name: 'Vàng đồng', hex: '#EFBF69', role: 'Màu font và màu họa tiết' },
      { name: 'Vàng nhạt', hex: '#F0C270', role: 'Màu font và màu họa tiết' },
      { name: 'Vàng mai', hex: '#FDD05D', role: 'Màu hoa mai và màu font' },
      { name: 'Vàng cam', hex: '#F0A622', role: 'Màu font và màu họa tiết' }
    ],
    visualCue: [
          {
                "title": "Khung vòm",
                "text": "Trong phông nền, brochure, poster luôn có sự xuất hiện của khung vòm mang đậm màu sắc Hồi giáo. Hoàn toàn có thể cách điệu để phù hợp với sự giao thoa văn hóa hai nước trong dịp Tết Nguyên Đán.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/khung-vom-tet-viet.webp",
                            "caption": "Khung vòm hoa văn",
                            "w": 1081,
                            "h": 508
                      },
                      {
                            "src": "assets/moodboard/cut/khung-vom-phap.webp",
                            "caption": "Khung vòm viền cánh sen",
                            "w": 1110,
                            "h": 542
                      },
                      {
                            "src": "assets/moodboard/cut/khung-vom-poster.webp",
                            "caption": "Khung vòm đứng",
                            "w": 436,
                            "h": 822
                      }
                ]
          },
          {
                "title": "Nan quạt bán nguyệt",
                "text": "Hình nan quạt bán nguyệt xuất hiện dày đặc, xếp lớp tạo không khí Tết; ghép hai hình bán nguyệt thành hình những nan quạt tròn, tạo điểm nhấn thị giác.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/nan-quat-do.webp",
                            "caption": "Cụm quạt xếp lớp",
                            "w": 988,
                            "h": 556
                      },
                      {
                            "src": "assets/moodboard/cut/nan-quat-hoa.webp",
                            "caption": "Nan quạt bán nguyệt",
                            "w": 656,
                            "h": 552
                      },
                      {
                            "src": "assets/moodboard/cut/nan-quat-ban-nguyet.webp",
                            "caption": "Nan quạt bán nguyệt vàng",
                            "w": 692,
                            "h": 346
                      },
                      {
                            "src": "assets/moodboard/cut/nan-quat-dai.webp",
                            "caption": "Dải nan quạt",
                            "w": 1500,
                            "h": 261
                      },
                      {
                            "src": "assets/moodboard/cut/nan-quat-vien.webp",
                            "caption": "Viền nan quạt đỏ cam",
                            "w": 1413,
                            "h": 260
                      }
                ]
          },
          {
                "title": "Trống đồng và nan quạt tròn",
                "text": "Thiết kế trống đồng, nan quạt tròn đều được sử dụng nhiều trong các thiết kế. Các hình khối này được ghép theo phông nền.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/trong-dong.webp",
                            "caption": "Trống đồng",
                            "w": 813,
                            "h": 812
                      },
                      {
                            "src": "assets/moodboard/cut/trong-dong-bia.webp",
                            "caption": "Trống đồng cách điệu",
                            "w": 662,
                            "h": 652
                      },
                      {
                            "src": "assets/moodboard/cut/nan-quat-tron.webp",
                            "caption": "Nan quạt tròn",
                            "w": 510,
                            "h": 510
                      }
                ]
          },
          {
                "title": "Đường viền và dải trang trí",
                "text": "Những đường viền mảnh dùng để ngăn cách các phần nội dung và làm gọn bố cục trên phông nền, brochure và poster.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/vien-may.webp",
                            "caption": "Viền mây",
                            "w": 1385,
                            "h": 19
                      },
                      {
                            "src": "assets/moodboard/cut/vien-kim-cuong.webp",
                            "caption": "Viền kim cương",
                            "w": 1414,
                            "h": 68
                      },
                      {
                            "src": "assets/moodboard/cut/dai-may.webp",
                            "caption": "Dải mây vàng",
                            "w": 872,
                            "h": 762
                      }
                ]
          }
    ],
    fonts: {
      title: [{ src: 'assets/moodboard/06-font-v2.jpg', caption: '' }],
      body: []
    },
    elements: [
          {
                "title": "Hoa mai và hoa đào",
                "text": "Hoa mai vàng và hoa đào hồng, hai loài hoa gợi không khí Tết Việt.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/hoa-mai-mot.webp",
                            "caption": "Hoa mai",
                            "w": 527,
                            "h": 518
                      },
                      {
                            "src": "assets/moodboard/cut/canh-mai-phang.webp",
                            "caption": "Cành mai",
                            "w": 469,
                            "h": 480
                      },
                      {
                            "src": "assets/moodboard/cut/canh-mai-mau-nuoc.webp",
                            "caption": "Cành mai màu nước",
                            "w": 422,
                            "h": 494
                      },
                      {
                            "src": "assets/moodboard/cut/canh-mai-vang.webp",
                            "caption": "Cành mai vàng",
                            "w": 422,
                            "h": 638
                      },
                      {
                            "src": "assets/moodboard/cut/hoa-dao.webp",
                            "caption": "Hoa đào",
                            "w": 605,
                            "h": 528
                      },
                      {
                            "src": "assets/moodboard/cut/hoa-dao-doi.webp",
                            "caption": "Hoa đào đôi",
                            "w": 706,
                            "h": 533
                      },
                      {
                            "src": "assets/moodboard/cut/canh-hoa-hong.webp",
                            "caption": "Cành hoa hồng phấn",
                            "w": 732,
                            "h": 446
                      }
                ]
          },
          {
                "title": "Chim én và chim lạc",
                "text": "Chim én báo hiệu mùa xuân, chim lạc lấy từ họa tiết trống đồng.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/chim-en.webp",
                            "caption": "Đàn chim én",
                            "w": 1114,
                            "h": 516
                      },
                      {
                            "src": "assets/moodboard/cut/chim-kem.webp",
                            "caption": "Chim vàng kem",
                            "w": 805,
                            "h": 517
                      },
                      {
                            "src": "assets/moodboard/cut/chim-lac.webp",
                            "caption": "Chim lạc",
                            "w": 953,
                            "h": 494
                      }
                ]
          },
          {
                "title": "Biểu tượng",
                "text": "Con dê của năm Đinh Mùi, pháo hoa và nét đường chân trời quê hương.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/de-vang.webp",
                            "caption": "Con dê",
                            "w": 617,
                            "h": 709
                      },
                      {
                            "src": "assets/moodboard/cut/phao-hoa.webp",
                            "caption": "Pháo hoa",
                            "w": 895,
                            "h": 607
                      },
                      {
                            "src": "assets/moodboard/cut/skyline.webp",
                            "caption": "Đường chân trời",
                            "w": 1396,
                            "h": 440
                      }
                ]
          },
          {
                "title": "Ẩm thực",
                "text": "Ảnh decor ẩm thực Việt, tách nền để ghép vào bàn tiệc, tờ rơi và hình quảng bá.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/banh-chung-minh-hoa.webp",
                            "caption": "Bánh chưng minh họa",
                            "w": 842,
                            "h": 559
                      },
                      {
                            "src": "assets/moodboard/cut/banh-chung-that.webp",
                            "caption": "Bánh chưng",
                            "w": 868,
                            "h": 555
                      },
                      {
                            "src": "assets/moodboard/cut/pho.webp",
                            "caption": "Phở",
                            "w": 671,
                            "h": 475
                      },
                      {
                            "src": "assets/moodboard/cut/nem-ran.webp",
                            "caption": "Nem rán",
                            "w": 652,
                            "h": 434
                      },
                      {
                            "src": "assets/moodboard/cut/banh-mi.webp",
                            "caption": "Bánh mì",
                            "w": 791,
                            "h": 288
                      },
                      {
                            "src": "assets/moodboard/cut/ca-phe.webp",
                            "caption": "Cà phê",
                            "w": 381,
                            "h": 510
                      },
                      {
                            "src": "assets/moodboard/cut/la-chuoi.webp",
                            "caption": "Lá chuối",
                            "w": 951,
                            "h": 501
                      },
                      {
                            "src": "assets/moodboard/cut/khan-caro.webp",
                            "caption": "Khăn caro",
                            "w": 727,
                            "h": 604
                      }
                ]
          },
          {
                "title": "Hoa văn Hồi giáo",
                "text": "Họa tiết Hồi giáo dạng lưới hình học, dùng làm góc khung và nền phụ.",
                "images": [
                      {
                            "src": "assets/moodboard/cut/goc-hoi-giao-1.webp",
                            "caption": "Góc hoa văn 1",
                            "w": 683,
                            "h": 676
                      },
                      {
                            "src": "assets/moodboard/cut/goc-hoi-giao-2.webp",
                            "caption": "Góc hoa văn 2",
                            "w": 659,
                            "h": 659
                      },
                      {
                            "src": "assets/moodboard/cut/goc-hoi-giao-3.webp",
                            "caption": "Góc hoa văn 3",
                            "w": 437,
                            "h": 874
                      },
                      {
                            "src": "assets/moodboard/cut/hoa-van-hoi-giao.webp",
                            "caption": "Hoa văn lặp",
                            "w": 750,
                            "h": 750
                      }
                ]
          }
    ],
    products: {
      backdrop: [{ src: 'assets/backdrop/backdrop-2027.jpg', caption: 'Phông nền sân khấu chính thức: Thiết kế 16:9, hiện lên sân khấu trong không gian 3D.' }],
      poster: [{ src: 'assets/poster/poster-facebook.jpg', caption: 'Poster Facebook chính thức: Dùng làm key visual của sự kiện.' }]
    }
  },

  scene: {
    backdropImage: 'assets/backdrop/backdrop-2027.jpg',
    backdropSize: [6.4, 3.6],
    useLed: false,
    gateText: 'XUÂN QUÊ HƯƠNG ĐINH MÙI 2027',
    emblemImage: 'assets/ref/quoc-huy.png',
    embassy: {
      nameVi: 'ĐẠI SỨ QUÁN VIỆT NAM TẠI ALGERIA',
      nameFr: 'AMBASSADE DE LA RÉPUBLIQUE SOCIALISTE DU VIETNAM EN ALGÉRIE',
      address: '30, Chénoua Street, Hydra, Algiers, Algeria'
    },
    couplets: {
      left: 'Xuân Sang Cội Phúc Sinh Nhành Lộc',
      right: 'Tết Về Cây Đức Trổ Thêm Hoa'
    },
    booths: {
      coffee: { vi: 'Gian cà phê', fr: 'Stand de café' },
      tea: { vi: 'Gian trà', fr: 'Stand de thé' }
    },
    lixiTitle: 'Hái lộc đầu xuân',
    lixiCards: [],
    lixiTextPos: 'middle',
    lixiTextColor: '#fbe9b8',
    lixiMessages: [
      "Năm mới an khang, vạn sự như ý.",
      "Chúc bạn một năm nhiều niềm vui và thật nhiều sức khỏe.",
      "Tiền vô như nước, tài lộc đầy nhà.",
      "Bonne année ! Que 2027 vous apporte joie et santé.\nNăm mới vui khỏe, nhiều niềm vui.",
      "Cung chúc tân xuân, vạn sự cát tường.",
      "Tết là đoàn viên: hôm nay có người mình thương ở bên, đó là lộc lớn nhất.",
      "Một năm mới bình an, công việc hanh thông.",
      "Mùi mềm mại, năm mới êm đềm, mọi việc suôn sẻ.",
      "Chúc bạn gặp nhiều may mắn và những người bạn tốt.",
      "Que cette nouvelle année vous apporte prospérité et bonheur.\nChúc năm mới thịnh vượng, hạnh phúc.",
      "Sức khỏe dồi dào, tâm an, ý vui.",
      "Xuân sang hoa nở, lộc đến bên thềm.",
      "Học hành tấn tới, sự nghiệp thăng hoa.",
      "Đi đâu cũng gặp quý nhân, làm gì cũng gặp thuận lợi.",
      "Mong gia đình bạn sum vầy, ấm áp trong ngày Tết.",
      "Meilleurs vœux de santé et de réussite !\nChúc sức khỏe và thành công.",
      "Mỗi nụ cười hôm nay là một tấm lộc đầu năm.",
      "Chúc bạn nhiều bình yên giữa những ngày bận rộn.",
      "Cà phê thơm, trà ngát, năm mới ngọt ngào.",
      "Xuân về mang theo hy vọng mới, chúc bạn mọi điều như ý.",
      "Năm mới, bạn bè gần xa luôn nhớ về nhau.",
      "Chúc tình hữu nghị Việt Nam và Algeria mãi xanh tươi như mùa xuân.\nQue l'amitié Vietnam-Algérie reste éternellement printanière.",
      "Lộc xuân đầu năm, may mắn cả năm.",
      "Một chén trà đầu năm, một năm trọn niềm vui.",
      "Chúc bạn bước sang năm mới với trái tim nhẹ nhàng.",
      "Bánh chưng xanh, câu đối đỏ, Tết này thêm ý nghĩa.",
      "Gặp nhau là duyên, cùng đón Tết là lộc.",
      "Ước gì trong năm mới, điều bạn mong sẽ thành.",
      "Joyeux Têt ! Que l'année du Chèvre vous soit douce.\nVui Tết Đinh Mùi, năm Mùi thật êm ái.",
      "Chúc bạn một năm mới rộn ràng tiếng cười."
],
    foods: [
      { kind: 'pho', name: 'Phở bò', note: 'Xin mời!' },
      { kind: 'banhmi', name: 'Bánh mì', note: 'Xin mời!' },
      { kind: 'sup', name: 'Súp', note: 'Xin mời!' },
      { kind: 'che', name: 'Chè', note: 'Xin mời!' },
      { kind: 'banhchung', name: 'Bánh chưng', note: 'Xin mời!' },
      { kind: 'nem', name: 'Nem rán', note: 'Xin mời!' }
    ]
  },

  brochure: {
    title: 'Brochure chương trình',
    front: 'assets/brochure/mat-truoc.jpg',
    back: 'assets/brochure/mat-sau.jpg',
    frontLabel: 'Mặt tiếng Việt',
    backLabel: 'Mặt tiếng Pháp (Verso)',
    note: 'Brochure được phát tại bàn đón tiếp. Khách có thể cầm theo để xem lại chương trình.'
  },

  thanks: {
    title: 'Xin trân trọng cảm ơn',
    message: 'Cảm ơn bạn đã xem phần hình ảnh truyền thông của chương trình Xuân Quê hương 2027, do nhóm thực tập sinh chúng mình thực hiện trong thời gian thực tập tại Đại sứ quán Việt Nam tại Algeria.',
    sign: 'Nhóm Thực tập sinh tại Đại sứ quán Việt Nam tại Algeria'
  },

  zonesRev: 4,
  themeRev: 2,
  moodRev: 3,
  zones: [
    {
      id: 'gate', no: 1, name: 'Cổng chào',
      desc: 'Cổng vòm đỏ trước tường rào, chữ Xuân Quê hương Đinh Mùi 2027 uốn theo vòm, hai bên là hàng rào tre treo nón lá và câu đối.',
      plan: 'Điểm chụp ảnh đầu tiên của khách, thảm đỏ trải từ mép đường tới bàn đón tiếp.'
    },
    {
      id: 'reception', no: 2, name: 'Bàn đón tiếp',
      desc: 'Quầy phủ đỏ có sổ lưu bút, chồng brochure và hai cây đào, mai treo lì xì, câu đối. Bấm vào cây để hái lộc, bấm vào brochure để xem.',
      plan: 'Nhân sự đón khách, phát brochure và hướng dẫn khách tới từng khu.'
    },
    {
      id: 'coffee', no: 3, name: 'Gian thưởng thức cà phê',
      desc: 'Gian mái sọc đỏ trắng, kệ gỗ bày gói cà phê, quầy phin và nhiều cốc để khách nếm thử.',
      plan: 'Cà phê là một trong những mặt hàng nông sản xuất khẩu chủ lực của Việt Nam, và Việt Nam thuộc nhóm các nước xuất khẩu cà phê lớn nhất thế giới. Cà phê phin nhỏ giọt, cà phê sữa đá là những cách thưởng thức đã trở thành nét văn hóa riêng của người Việt.'
    },
    {
      id: 'tea', no: 4, name: 'Gian thưởng thức trà',
      desc: 'Cùng phong cách gian cà phê, banner xanh lá, kệ hộp trà và bộ ấm chén để khách nếm thử.',
      plan: 'Biển nhỏ song ngữ giới thiệu văn hóa uống trà ngày Tết.'
    },
    {
      id: 'banhchung', no: 5, name: 'Khu trải nghiệm gói bánh chưng',
      desc: 'Bàn gói có lá dong, nếp, nhân và khuôn, phía trước là ba tấm chiếu cói. Nồi bánh đặt ở góc ngoài, có hơi nước bốc lên.',
      plan: 'Khu nhiều ảnh và video nhất, cần một người chụp quay riêng.'
    },
    {
      id: 'cocktail', no: 6, name: 'Bàn tiệc đứng',
      desc: 'Các bàn cao phủ khăn đỏ ở giữa sân để khách vừa đứng dùng món vừa trò chuyện.'
    },
    {
      id: 'buffet', no: 7, name: 'Khu buffet món Việt',
      desc: 'Mái che lớn với sáu bàn: phở, bánh mì, súp, chè, bánh chưng và nem rán. Bấm vào từng bàn để xem tên món.'
    },
    {
      id: 'seating', no: 8, name: 'Khu mời ngồi',
      desc: 'Các bàn tròn cho khách lớn tuổi, gia đình có trẻ nhỏ, đặt bên trái gần sân khấu dưới tán cây.'
    },
    {
      id: 'standing', no: 9, name: 'Khu khách đứng',
      desc: 'Khoảng sân rộng trước sân khấu, nơi phần lớn khách đứng theo dõi chương trình.'
    },
    {
      id: 'stage', no: 10, name: 'Sân khấu',
      desc: 'Bục thấp trải thảm đỏ sát tường trắng, đủ cho phát biểu, trao quà và chụp ảnh tập thể.'
    },
    {
      id: 'backdrop', no: 11, name: 'Phông nền',
      desc: 'Phông chính thức của chương trình: nền đỏ lì xì, khung vòm vàng mang hoa văn Hồi giáo ôm lấy dòng chữ Xuân Quê Hương, nan quạt và hoa đào, hoa mai ở chân phông.'
    },
    {
      id: 'podium', no: 12, name: 'Bục phát biểu',
      desc: 'Đặt bên trái sân khấu, có micro và biểu tượng chương trình, người phát biểu đứng gần phông.'
    }
  ]
};
