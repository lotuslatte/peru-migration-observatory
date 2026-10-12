from omp.aggregate.cards import build_migration
import os
d = build_migration(); sizes = [os.path.getsize(d / f) for f in os.listdir(d)]; print(d, len(sizes), "png; max", max(sizes) // 1024, "KB")
