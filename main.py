import streamlit as st
import uuid
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, START, END, add_messages
from typing import TypedDict, Annotated
from dotenv import load_dotenv

load_dotenv()

# Define the state class
class PsychatristState(TypedDict):
    query: str
    LLm_psychatrist: str
    messages: Annotated[list[HumanMessage | AIMessage], add_messages]

# Load LLM model
model = ChatOpenAI(model='gpt-4o-mini')

# Node to get AI response
def llm_node(state: PsychatristState):
    messages = state.get("messages", [])
    response = model.invoke(messages)
    state["LLm_psychatrist"] = response.content
    return {"LLm_psychatrist": response.content}

# Node to update chat history
def chat_message_history(state: PsychatristState):
    messages = state.get("messages", [])
    if "LLm_psychatrist" in state:
        messages.append(AIMessage(content=state["LLm_psychatrist"]))
    return {"messages": messages}

# Create LangGraph workflow
graph = StateGraph(PsychatristState)
graph.add_node("llm", llm_node)
graph.add_node("chat_message_history", chat_message_history)
graph.add_edge(START, "llm")
graph.add_edge("llm", "chat_message_history")
graph.add_edge("chat_message_history", END)
workflow = graph.compile()

# Streamlit UI Setup
st.set_page_config(page_title="AI Psychiatrist Chatbot", page_icon="🧠")
st.title("🧠 AI Psychiatrist Chatbot")

# Initialize session state
if "session_id" not in st.session_state:
    st.session_state["session_id"] = str(uuid.uuid4())
if "messages" not in st.session_state:
    st.session_state["messages"] = []

# 🔄 Show full chat history like ChatGPT
for msg in st.session_state["messages"]:
    if isinstance(msg, HumanMessage):
        st.chat_message("user").write(msg.content)
    elif isinstance(msg, AIMessage):
        st.chat_message("assistant").write(msg.content)

# User input
user_input = st.chat_input("How are you feeling today?")
if user_input:
    # Show user input immediately
    st.chat_message("user").write(user_input)
    st.session_state["messages"].append(HumanMessage(content=user_input))

    # Prepare state for LLM
    state = {
        "query": user_input,
        "LLm_psychatrist": "",
        "messages": st.session_state["messages"][:],  # full context
    }

    # Run the LLM workflow
    result = workflow.invoke(state)

    # Create and store AI response
    ai_msg = AIMessage(content=result["LLm_psychatrist"])
    st.session_state["messages"].append(ai_msg)

    # Display AI response
    st.chat_message("assistant").write(ai_msg.content)
