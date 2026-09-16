const movies = [
  {
    id: 1,
    title: "Người nhện: Không còn nhà",
    year: 2021,
    rating: 8.2,
    genre: "Siêu anh hùng",
    duration: "2g 28p",
    quality: "Full HD",
    desc: "Với danh tính đã bị lộ, Peter Parker nhờ sự giúp đỡ của Doctor Strange để mọi người quên đi chàng là ai. Nhưng phép thuật lại vô tình mở ra đa vũ trụ, đưa những kẻ thù nguy hiểm từ các thế giới khác đến đây.",
    img: "https://picsum.photos/seed/movie1/400/600",
  },
  {
    id: 2,
    title: "Kẻ trộm mặt trăng 4",
    year: 2024,
    rating: 7.1,
    genre: "Hoạt hình",
    duration: "1g 35p",
    quality: "Full HD",
    desc: "Gru đối mặt với một kẻ thù mới đầy quyền lực. Cả gia đình Gru buộc phải trốn chạy và tìm chỗ nương náu tại căn cứ của Liên minh chống tội phạm.",
    img: "https://picsum.photos/seed/movie2/400/600",
  },
  {
    id: 3,
    title: "Dune: Hành tinh cát",
    year: 2024,
    rating: 8.6,
    genre: "Khoa học viễn tưởng",
    duration: "2g 46p",
    quality: "IMAX",
    desc: "Paul Atreides hợp lực với người Fremen để trả thù những kẻ đã hủy diệt gia tộc mình, đồng thời phải đấu tranh để ngăn chặn một tương lai khủng khiếp mà cậu nhìn thấy trước.",
    img: "https://picsum.photos/seed/movie3/400/600",
  },
  {
    id: 4,
    title: "Deadpool & Wolverine",
    year: 2024,
    rating: 8.0,
    genre: "Hành động",
    duration: "2g 8p",
    quality: "Full HD",
    desc: "Deadpool được cơ quan TVA tuyển mộ để cứu lấy dòng thời gian của mình, nhưng anh không thể làm điều đó một mình và cần đến sự giúp đỡ của Wolverine.",
    img: "https://picsum.photos/seed/movie4/400/600",
  },
  {
    id: 5,
    title: "Inside Out 2",
    year: 2024,
    rating: 8.4,
    genre: "Hoạt hình",
    duration: "1g 36p",
    quality: "Full HD",
    desc: "Khi nhiều cảm xúc mới xuất hiện trong tâm trí của Riley vừa tròn 13 tuổi, Joy và các cảm xúc cũ phải học cách làm quen với những gương mặt mới lạ.",
    img: "https://picsum.photos/seed/movie5/400/600",
  },
  {
    id: 6,
    title: "Inception",
    year: 2010,
    rating: 8.8,
    genre: "Hành động",
    duration: "2g 28p",
    quality: "Full HD",
    desc: "Một tên trộm đánh cắp thông tin bí mật qua giấc mơ phải thực hiện nhiệm vụ khó nhất: cấy một ý tưởng vào trong đầu một người.",
    img: "https://picsum.photos/seed/movie6/400/600",
  },
  {
    id: 7,
    title: "Top Gun: Maverick",
    year: 2022,
    rating: 8.3,
    genre: "Hành động",
    duration: "2g 10p",
    quality: "IMAX",
    desc: "Sau hơn 30 năm phục vụ, Maverick vẫn là một phi công tài năng, nhưng giờ đây anh phải đối mặt với ký ức về người bạn thân Goose và thế hệ phi công trẻ.",
    img: "https://picsum.photos/seed/movie7/400/600",
  },
  {
    id: 8,
    title: "Oppenheimer",
    year: 2023,
    rating: 8.4,
    genre: "Chính kịch",
    duration: "3g 0p",
    quality: "IMAX",
    desc: "Câu chuyện về J. Robert Oppenheimer - nhà vật lý lãnh đạo Dự án Manhattan chế tạo quả bom nguyên tử đầu tiên trong lịch sử.",
    img: "https://picsum.photos/seed/movie8/400/600",
  },
  {
    id: 9,
    title: "The Batman",
    year: 2022,
    rating: 7.8,
    genre: "Hành động",
    duration: "2g 56p",
    quality: "Full HD",
    desc: "Batman phải lần theo manh mối của một kẻ giết người hàng loạt có tên Riddler, người đang để lại những câu đố về thế lực ngầm của Gotham.",
    img: "https://picsum.photos/seed/movie9/400/600",
  },
  {
    id: 10,
    title: "Joker",
    year: 2019,
    rating: 8.4,
    genre: "Chính kịch",
    duration: "2g 2p",
    quality: "Full HD",
    desc: "Arthur Fleck - một diễn viên hài thất bại - dần rơi vào vòng xoáy điên loạn giữa một Gotham mục nát, trở thành kẻ phản diện khét tiếng nhất thành phố.",
    img: "https://picsum.photos/seed/movie10/400/600",
  },
];

const STORAGE_KEY = "movief_movies";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const all = saved ? JSON.parse(saved) : movies;
  return { all, nextId: all.reduce((max, m) => Math.max(max, m.id), 0) + 1 };
}

function saveState(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function getMovie(id) {
  return loadState().all.find((m) => m.id === Number(id));
}

function movieCard(m) {
  return `
    <a class="movie-card" href="detail.html?id=${m.id}">
      <img src="${m.img}" alt="${m.title}" loading="lazy" />
      <div class="info">
        <h3>${m.title}</h3>
        <div class="meta">
          <span>${m.year}</span>
          <span class="rating">★ ${m.rating}</span>
        </div>
      </div>
    </a>`;
}