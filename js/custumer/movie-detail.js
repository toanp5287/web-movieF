const params = new URLSearchParams(window.location.search);
const movieId = params.get("id");

async function loadMovie() {
    const response = await fetch("../data/db.json");
    const data = await response.json();

    const movie = data.movies.find(item => item.id === movieId);

    if (!movie) {
        console.log("Không tìm thấy phim");
        return;
    }

    // Tên phim
    const title = document.querySelector("h1");

    if (title) {
        title.textContent = `${movie.title} (${movie.year})`;
    }

    // Mô tả
    const description = document.querySelector(
        "p.font-body-lg.text-body-lg"
    );

    if (description) {
        description.textContent = movie.description;
    }

    // Poster
    const poster = document.querySelector("#movie-poster");

    if (poster) {
        poster.src = movie.poster;
    }
    // Đạo diễn
const director = document.querySelector("#movie-director");

if (director) {
    director.textContent = movie.director;
}

// Diễn viên
const actors = document.querySelector("#movie-actors");

if (actors) {
    actors.textContent = movie.actors.join(", ");
}

    // Thông tin năm, thời lượng, quốc gia
    const info = document.querySelectorAll(
        ".flex.items-center.gap-4.text-on-surface"
    );

    if (info.length > 0) {
        const spans = info[0].querySelectorAll(":scope > span");

        if (spans[0]) {
            spans[0].lastChild.textContent = movie.year;
        }

        if (spans[2]) {
            spans[2].lastChild.textContent = movie.duration + " phút";
        }

        if (spans[4]) {
            spans[4].lastChild.textContent = movie.country;
        }
    }

    // Ảnh nền
const background = document.querySelector("#movie-backdrop");

if (background && movie.backdrop) {
    background.style.backgroundImage =
        `url("${movie.backdrop}")`;
}
}

loadMovie();