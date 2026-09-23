import { loadComponents } from "../../components/components.js";
import movieService from "../../api/movieApi.js";

loadComponents("..");

async function loadFeaturedMovie() {
    const movies = await movieService.getAllMovies();

    const movie = movies[0];

    console.log(movie);
}

loadFeaturedMovie();