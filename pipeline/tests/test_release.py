"""The release year is one setting: pooled windows, labels and break handling follow it."""
from omp import config
from omp.aggregate.common import crossed_break


def test_years_follow_headline_year():
    assert config.YEARS[-1] == config.HEADLINE_YEAR and config.YEARS[0] == config.FIRST_YEAR
    assert config.POOL_YEARS == config.YEARS[-5:] and len(config.POOL_YEARS) == 5


def test_yaml_labels_carry_the_headline_year():
    titles = " ".join(t["title"] for t in config.load_yaml("compendium_tables.yml")["tables"])
    assert "__" not in titles and str(config.HEADLINE_YEAR) in titles
    assert str(config.HEADLINE_YEAR) in config.load_yaml("indicators.yml")["indicators"]["median_inc_real"]["label_es"]


def test_deflator_is_one_in_the_headline_year():
    d = config.deflators()
    assert abs(d[config.HEADLINE_YEAR] - 1) < 1e-12 and all(d[y] >= 1 for y in config.YEARS)


def test_informality_break_sits_between_2023_and_2024():
    for ind in ("informality", "gap_inf_mig"):
        assert crossed_break(ind, 2023, 2024) and crossed_break(ind, 2014, 2025)
        # 2024 and 2025 both use the Observatory rule: comparable.
        assert crossed_break(ind, 2024, 2025) is None
    assert crossed_break("mig5_cross", 2014, 2025) is None
