"""
Campaign detection via embedding clustering.
Groups related incidents into coordinated attack campaigns.
"""
from sqlalchemy.ext.asyncio import AsyncSession


async def detect_campaigns(db: AsyncSession, min_cluster_size: int = 3) -> list[dict]:
    """
    Cluster recent incidents by embedding similarity.
    Returns list of campaign dicts with member incident IDs and centroid stats.
    """
    # TODO: fetch recent embeddings, run HDBSCAN or DBSCAN,
    #       persist campaign groups and return summaries
    raise NotImplementedError
